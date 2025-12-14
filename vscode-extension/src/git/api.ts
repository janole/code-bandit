import * as vscode from "vscode";

import { API, GitExtension, Repository, Status } from "./vscode-git.js";

// This function is now memoized to avoid repeatedly getting the extension
let gitAPI: API | undefined;
async function getGitAPI(): Promise<API | undefined>
{
    if (gitAPI)
    {
        return gitAPI;
    }

    try
    {
        const extension = vscode.extensions.getExtension<GitExtension>("vscode.git");
        if (!extension)
        {
            vscode.window.showWarningMessage("Git extension not found");
            return undefined;
        }
        await extension.activate();
        gitAPI = extension.exports.getAPI(1);
        return gitAPI;
    }
    catch (error)
    {
        console.error("Error getting Git extension API:", error);
        vscode.window.showErrorMessage("Could not activate the Git extension.");
        return undefined;
    }
}

async function getActiveRepository(props: { git?: API; sourceControl?: vscode.SourceControl; }): Promise<Repository | undefined>
{
    const git: API | undefined = props.git || await getGitAPI();

    if (!git)
    {
        return undefined;
    }

    if (props.sourceControl?.rootUri?.path)
    {
        const repo = git.repositories.find(repo => repo.rootUri.path === props.sourceControl!.rootUri!.path);

        if (repo)
        {
            return repo;
        }
    }

    if (git.repositories.length === 0)
    {
        vscode.window.showWarningMessage("No Git repository found.");

        return undefined;
    }

    for (const repo of git.repositories)
    {
        if (repo.state.indexChanges.length > 0)
        {
            return repo;
        }
    }

    vscode.window.showWarningMessage("No staged changes found.");

    return undefined;
}

async function getStagedInfo(repository: Repository)
{
    let info = "";

    const files = repository.state.indexChanges.map(({ status, originalUri, renameUri, uri }) =>
    {
        switch (status)
        {
            case Status.INDEX_ADDED:
                return "added: " + uri;
            case Status.INDEX_MODIFIED:
                return "modified: " + uri;
            case Status.INDEX_DELETED:
                return "deleted: " + uri;
            case Status.INDEX_RENAMED:
                return "renamed: " + originalUri + " to " + renameUri;
            case Status.INDEX_COPIED:
                return "copied: " + originalUri + " to " + renameUri;
        }
    });

    if (files.length)
    {
        info += "Staged changes:\n" + files.join("\n") + "\n";
    }

    const diffStagedResult = await repository.diff(true);

    if (diffStagedResult)
    {
        info += "Output of \`git diff --staged\`:\n" + diffStagedResult + "\n";
    }

    return info;
}

export
{
    getActiveRepository,
    getGitAPI,
    getStagedInfo,
};
