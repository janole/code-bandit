import { ApiClient } from "./api-client.js";

const URL = process.env["CODE_BANDIT_SERVER_URL"];
const PAT = process.env["CODE_BANDIT_SERVER_PAT"];

const chatServerClient = URL && PAT ? new ApiClient({ baseUrl: URL, token: PAT }) : undefined;

chatServerClient?.start();

export
{
    chatServerClient,
};
