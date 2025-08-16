import { COMMIT_HASH, VERSION } from "../.version.js";

// TODO: get this info from package.json!?

const APP_TITLE = "Code Bandit";

const GITHUB_OWNER = "janole";
const GITHUB_REPO = "code-bandit";

export function getAppTitle()
{
    return APP_TITLE;
}

export function getGithubOwner()
{
    return GITHUB_OWNER;
}

export function getGithubRepo()
{
    return GITHUB_REPO;
}

export function getGithubRepoUrl()
{
    return `https://github.com/${getGithubOwner()}/${getGithubRepo()}`;
}

export function getUserAgent()
{
    return `${getAppTitle().replace(/\s+/g, "")}/${VERSION}+${COMMIT_HASH} (+${getGithubRepoUrl()})`;
}
