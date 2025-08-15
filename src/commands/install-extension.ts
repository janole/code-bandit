import { execa } from "execa";
import fs from "fs";
import https from "https";
import os from "os";
import path from "path";

const GITHUB_OWNER = "janole";
const GITHUB_REPO = "code-bandit";

async function getReleaseAssetUrl(version: string): Promise<{ url: string; fileName: string }>
{
    // If the user requests a specific version, we use the direct tag URL.
    if (version !== "latest")
    {
        const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${version}`;
        console.log(`🔍 Fetching specific release information for tag '${version}'...`);

        const response = await fetch(apiUrl, { headers: { "User-Agent": "Code-Bandit-CLI" } });
        if (!response.ok)
        {
            throw new Error(`Failed to fetch release info for tag ${version}: ${response.statusText}`);
        }

        const releaseData = (await response.json()) as any;
        const asset = releaseData.assets?.find((a: any) => a.name.endsWith(".vsix"));
        if (!asset?.browser_download_url)
        {
            throw new Error(`Could not find a .vsix asset for version ${version}.`);
        }

        console.log(`✅ Found asset: ${asset.name}`);

        return { url: asset.browser_download_url, fileName: asset.name };
    }

    // If the user wants the latest, we search through recent releases to find one with a .vsix asset.
    console.log("🔍 Searching for the latest release with a .vsix asset...");
    const listApiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

    const response = await fetch(listApiUrl, { headers: { "User-Agent": "Code-Bandit-CLI" } });
    if (!response.ok)
    {
        throw new Error(`Failed to fetch release list: ${response.statusText}`);
    }

    const releases = (await response.json()) as any[];

    for (const release of releases)
    {
        const vsixAsset = release.assets?.find((a: any) => a.name.endsWith(".vsix"));

        if (vsixAsset)
        {
            // Found the most recent release with a VSIX file.
            console.log(`✅ Found latest suitable release: ${release.name} (Asset: ${vsixAsset.name})`);
            return { url: vsixAsset.browser_download_url, fileName: vsixAsset.name };
        }
    }

    // If we get here, no VSIX was found in any of the recent releases.
    throw new Error("Could not find a .vsix asset in any of the recent releases.");
}

async function downloadFile(url: string, dest: string): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        const agent = new https.Agent({ keepAlive: false });

        https.get(url, { headers: { "User-Agent": "Code-Bandit-CLI" }, agent }, (response) =>
        {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302)
            {
                if (response.headers.location)
                {
                    downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                    return;
                }
                return reject(new Error("Redirect location not found."));
            }

            if (response.statusCode !== 200)
            {
                return reject(new Error(`Download failed with status: ${response.statusCode} ${response.statusMessage}`));
            }

            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on("finish", () =>
            {
                file.close((err) =>
                {
                    response.destroy();

                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        resolve();
                    }
                });
            });
        })
            .on("error", (err) =>
            {
                fs.unlink(dest, () => { }); // Delete the file on error
                reject(err);
            });
    });
}

export async function installVscodeExtension(version = "latest")
{
    let tempFilePath = "";
    try
    {
        const { url: assetUrl, fileName } = await getReleaseAssetUrl(version);
        tempFilePath = path.join(os.tmpdir(), fileName);

        console.log(`🔽 Downloading extension to ${tempFilePath}...`);
        await downloadFile(assetUrl, tempFilePath);
        console.log("✅ Download complete.");

        console.log("📦 Installing extension using 'code' command...");
        await execa("code", ["--install-extension", tempFilePath]);

        console.log(
            "🎉 Successfully installed the Code Bandit VS Code extension!",
        );
    }
    catch (error: any)
    {
        let errorMessage = "❌ Installation failed.";

        if (error.message.includes("ENOENT"))
        {
            errorMessage += "\nCould not find the 'code' command. Please ensure you have launched VS Code and run the 'Shell Command: Install 'code' command in PATH' command from the command palette (Cmd+Shift+P).";
        }
        else if (error.message)
        {
            errorMessage += `\nError: ${error.message}`;
        }

        if (error.stderr)
        {
            errorMessage += `\nDetails: ${error.stderr}`;
        }

        console.error(errorMessage);
    }
    finally
    {
        // Clean up the temporary file
        if (tempFilePath && fs.existsSync(tempFilePath))
        {
            fs.unlinkSync(tempFilePath);
            console.log("🧹 Cleaned up temporary file.");
        }
    }
}
