import { ApiClient } from "./api-client.js";

const URL = process.env["CODE_BANDIT_SERVER_URL"];
const PAT = process.env["CODE_BANDIT_SERVER_PAT"];

const chatServerClient = URL && PAT ? new ApiClient({ baseUrl: URL, token: PAT }) : undefined;

type TCommandListenerFunc = (payload: any) => void;

const commandListeners: TCommandListenerFunc[] = [];

const addCommandListener = (f: TCommandListenerFunc) =>
{
    if (!commandListeners.includes(f))
    {
        commandListeners.push(f);
    }
};

const removeCommandListener = (f: TCommandListenerFunc) =>
{
    const i = commandListeners.indexOf(f);

    if (i !== -1)
    {
        commandListeners.splice(i, 1);
    }
};

chatServerClient?.subscribeDocuments(payload =>
{
    console.log("P", payload);

    for (const f of commandListeners)
    {
        if (payload.table === "documents" && payload.eventType === "INSERT" && payload.new?.data?.external_id)
        {
            f(payload.new.data);
        }
    }
}, {
    onOpen: () => console.log("OPEN"),
    onError: (err) => console.error("ERR", err),
});

export
{
    addCommandListener,
    chatServerClient,
    removeCommandListener
};

