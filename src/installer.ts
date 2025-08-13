import { execa } from "execa";
import fs from "fs";
import https from "https";
import os from "os";
import path from "path";

const GITHUB_OWNER = "janole";
const GITHUB_REPO = "code-bandit";

async function getReleaseAssetUrl(version: string): Promise<{ url: string, fileName: string }>
{
    const tag = version === "latest" ? "latest" : `tags/${version}`;
    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/${tag}`;

    console.log(`🔍 Fetching release information from ${apiUrl}...`);

    const response = await fetch(apiUrl, {
        headers: { "User-Agent": "Code-Bandit-CLI" },
    });

    if (!response.ok)
    {
        throw new Error(`Failed to fetch release info: ${response.statusText} (URL: ${apiUrl})`);
    }

    const releaseData = (await response.json()) as any;
    const asset = releaseData.assets?.find((a: any) =>
        a.name.endsWith(".vsix"),
    );

    if (!asset?.browser_download_url)
    {
        throw new Error(`Could not find a .vsix asset for version ${version}.`);
    }

    console.log(`✅ Found asset: ${asset.name}`);
    return { url: asset.browser_download_url, fileName: asset.name };
}

async function downloadFile(url: string, dest: string): Promise<void>
{
    return new Promise((resolve, reject) =>
    {
        https.get(url, { headers: { "User-Agent": "Code-Bandit-CLI" } }, (response) =>
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
            errorMessage += "\\nCould not find the 'code' command. Please ensure you have launched VS Code and run the 'Shell Command: Install \\\\'code\\\\' command in PATH' command from the command palette (Cmd+Shift+P).";
        }
        else if (error.message)
        {
            errorMessage += `\\nError: ${error.message}`;
        }

        if (error.stderr)
        {
            errorMessage += `\\nDetails: ${error.stderr}`;
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
