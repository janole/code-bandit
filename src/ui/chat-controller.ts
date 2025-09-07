import clipboard from "clipboardy";
import { Key, useApp } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";

import { ChatService } from "../ai/chat-service.js";
import { ErrorMessage, TMessage, ToolProgressMessage } from "../ai/custom-messages.js";
import { ChatSession } from "../ai/session/session.js";
import { countTokens, lastMessageFromAI, TTokenUsage } from "../ai/tokens.js";
import { getGitBranch } from "../ai/tools/git-tools.js";
import { needsToolConfirmation, work } from "../ai/work.js";

interface UseChatControllerProps
{
    chatService: ChatService;
    session: ChatSession;
    streaming?: boolean;
}

export function useChatController(props: UseChatControllerProps)
{
    const { chatService, session, streaming = true } = props;

    const { exit } = useApp();

    const [working, setWorking] = useState(false);

    const [abortController, setAbortController] = useState<AbortController>();
    const [ctrlC, setCtrlC] = useState(false);

    const [_, setToolMode] = useState(session.toolMode);

    const [chatHistory, setChatHistory] = useState<{ messages: TMessage[]; finished: number }>({
        messages: session.messages,
        finished: session.finished || 0,
    });

    const messagesQueueRef = useRef<Promise<void>>(Promise.resolve());

    const [tokenUsage, setTokenUsage] = useState<TTokenUsage>();
    const [currentGitBranch, setCurrentGitBranch] = useState<string | null>();

    const selectedIndex = chatHistory.messages.findIndex(m => ToolProgressMessage.isTypeOf(m) && m.status === "pending-confirmation");
    const confirm = selectedIndex !== -1;

    const handleSendHistory = (messages: TMessage[], finished?: number) =>
    {
        setChatHistory(history => ({ messages, finished: Math.max(finished || 0, history.finished) }));
        setWorking(true);

        const abortController = new AbortController();
        setAbortController(abortController);

        messagesQueueRef.current = messagesQueueRef.current
            .then(() => session.setMessages(messages, session.finished))
            .catch(() => { }); // keep the chain alive

        work({
            chatService,
            session,
            streaming,
            send: (messages: TMessage[]) => setChatHistory(history => ({ ...history, messages })),
            signal: abortController.signal,
        })
            .then(messages => 
            {
                if (needsToolConfirmation(messages))
                {
                    setChatHistory(history => ({ ...history, messages }));
                }
                else
                {
                    setChatHistory({ messages, finished: messages.length });
                }
            })
            .catch(error => 
            {
                setChatHistory(history => ({
                    messages: [
                        ...history.messages,
                        new ErrorMessage(`ERROR: running work({...}) failed with: ${error.message || error.toString()}`, error),
                    ],
                    finished: history.messages.length + 1,
                }));
            })
            .finally(() => 
            {
                setWorking(false);
            });
    };

    const handleInput = (input: string, key: Key): boolean =>
    {
        if (key.ctrl && input === "c")
        {
            if (!ctrlC)
            {
                setCtrlC(true);
            }
            else if (abortController)
            {
                abortController.abort("Ctrl-C");
                setAbortController(undefined);
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
                const direction = key.leftArrow ? -1 : 1;

                setChatHistory(history => ({
                    ...history,
                    messages: [
                        ...history.messages.slice(0, selectedIndex),
                        (history.messages[selectedIndex] as ToolProgressMessage).toggleConfirmState({ direction }),
                        ...history.messages.slice(selectedIndex + 1),
                    ],
                }));
            }

            if (key.return)
            {
                const confirmState = (chatHistory.messages[selectedIndex] as ToolProgressMessage).confirmState;

                if (confirmState === "none")
                {
                    setToolMode?.(session.toolMode = "read-only");
                }
                else if (confirmState === "all")
                {
                    setToolMode?.(session.toolMode = "yolo");
                }

                handleSendHistory([
                    ...chatHistory.messages.slice(0, selectedIndex),
                    (chatHistory.messages[selectedIndex] as ToolProgressMessage).clone({
                        status: (confirmState === "yes" || confirmState === "all") ? "confirmed" : "declined",
                        confirmState,
                    }),
                    ...chatHistory.messages.slice(selectedIndex + 1),
                ]);
            }

            return true;
        }

        if (key.ctrl && input === "y")
        {
            const text = lastMessageFromAI(chatHistory.messages)?.text;
            text && clipboard.write(text);
            return true;
        }

        if (key.ctrl && input === "w")
        {
            setToolMode(toolMode => session.toolMode = (toolMode === "confirm" ? "read-only" : toolMode === "read-only" ? "yolo" : "confirm"));
            return true;
        }

        return !!confirm; // do not allow input as long as tool-confirmation is needed
    };

    useEffect(() =>
    {
        if (!working)
        {
            setAbortController(undefined);
            setCtrlC(false);
        }
    }, [
        working,
    ]);

    useEffect(() =>
    {
        if (!working)
        {
            messagesQueueRef.current = messagesQueueRef.current
                .then(() => session.setMessages(chatHistory.messages, chatHistory.finished))
                .catch(() => { }); // keep the chain alive

            setTokenUsage(countTokens(chatHistory.messages));

            getGitBranch().then(branch => setCurrentGitBranch(branch));
        }
    }, [
        working,
        session,
        chatHistory,
    ]);

    // TODO: refactor
    const action = ctrlC
        ? working
            ? abortController === null
                ? "Cancelled. Please wait ..."
                : "Cancel? Press Ctrl-C again ..."
            : "Quit? Press Ctrl-C again ..."
        : confirm
            ? "Use ← → arrow keys to select, Enter ↵ to confirm"
            : undefined;

    return {
        working,
        handleInput,
        action,
        selected: selectedIndex,
        setToolMode,
        chatHistory,
        handleSendHistory,
        tokenUsage,
        currentGitBranch,
    };
}
