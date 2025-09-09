import clipboard from "clipboardy";
import { Key, useApp } from "ink";
import { useCallback, useEffect, useState } from "react";

import { TMessage, ToolProgressMessage } from "../ai/custom-messages.js";
import { chatServerClient } from "../ai/session/chat-server/chat-server-client.js";
import { ChatSession, TToolMode } from "../ai/session/session.js";
import { countTokens, lastMessageFromAI, TTokenUsage } from "../ai/tokens.js";
import { getGitBranch } from "../ai/tools/git-tools.js";

interface UseChatControllerProps
{
    session: ChatSession;
}

export function useChatController(props: UseChatControllerProps)
{
    const { session } = props;

    const { exit } = useApp();

    const [ctrlC, setCtrlC] = useState(false);

    const [sessionState, setSessionState] = useState<{ messages: TMessage[]; working: boolean; toolMode: TToolMode; }>({
        messages: session.messages,
        working: session.isWorking,
        toolMode: session.toolMode,
    });

    const [tokenUsage, setTokenUsage] = useState<TTokenUsage>();
    const [currentGitBranch, setCurrentGitBranch] = useState<string | null>();

    const selectedIndex = sessionState.messages.findIndex(m => ToolProgressMessage.isTypeOf(m) && m.status === "pending-confirmation");
    const confirm = selectedIndex !== -1;

    // This effect subscribes to the session, making it the single source of truth.
    useEffect(() => session.onUpdate(setSessionState), [session]);

    const handleInput = useCallback((input: string, key: Key): boolean =>
    {
        if (key.ctrl && input === "c")
        {
            if (!ctrlC)
            {
                setCtrlC(true);
            }
            else if (session.isWorking)
            {
                session.abort("Ctrl-C");
            }
            else
            {
                exit();
                process.exit();
            }

            return true;
        }

        if (ctrlC)
        {
            setCtrlC(false);
            return true;
        }

        if (confirm)
        {
            if (key.leftArrow || key.rightArrow)
            {
                session.toggleConfirmState(selectedIndex, key.leftArrow ? -1 : 1);
            }
            else if (key.return)
            {
                const confirmState = (session.messages[selectedIndex] as ToolProgressMessage).confirmState;

                session.confirmToolUse(selectedIndex, confirmState);
            }

            return true;
        }

        if (key.ctrl && input === "y")
        {
            const text = lastMessageFromAI(session.messages)?.text;
            text && clipboard.write(text);
            return true;
        }

        if (key.ctrl && input === "w")
        {
            session.setToolMode(session.toolMode === "confirm" ? "read-only" : session.toolMode === "read-only" ? "yolo" : "confirm");
            return true;
        }

        return !!confirm; // do not allow input as long as tool-confirmation is needed
    }, [
        confirm,
        ctrlC,
        exit,
        selectedIndex,
        session,
    ]);

    useEffect(() =>
    {
        if (!sessionState.working)
        {
            setCtrlC(false);

            setTokenUsage(countTokens(session.messages));

            getGitBranch().then(branch => setCurrentGitBranch(branch));

            chatServerClient?.setStatus("idle", session.id);
        }
        else
        {
            chatServerClient?.setStatus("working", session.id);
        }
    }, [
        session,
        sessionState.working,
    ]);

    // TODO: refactor
    const action = ctrlC
        ? sessionState.working
            ? session.isAborted
                ? "Cancelled. Please wait ..."
                : "Cancel? Press Ctrl-C again ..."
            : "Quit? Press Ctrl-C again ..."
        : confirm
            ? "Use ← → arrow keys to select, Enter ↵ to confirm"
            : undefined;

    return {
        messages: sessionState.messages,
        working: sessionState.working,
        handleInput,
        action,
        selected: selectedIndex,
        tokenUsage,
        currentGitBranch,
    };
}
