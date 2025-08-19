import { HumanMessage } from "@langchain/core/messages";
import chalk from "chalk";
import { Box, Static, Text } from "ink";
import { homedir } from "os";
import React, { useEffect, useState } from "react";

import { ChatService } from "../ai/chat-service.js";
import { ChatSession } from "../ai/session/session.js";
import useTerminalSize from "../utils/use-terminal-size.js";
import { useChatController } from "./chat-controller.js";
import MemoMessage, { Message } from "./messages/message.js";
import { Badge } from "./messages/types.js";
import Spinner from "./spinner.js";
import TextInput from "./text-input.js";

interface ChatAppProps
{
    chatService: ChatService;
    session: ChatSession;
    startMessage?: string;
    streaming?: boolean;
    debug?: boolean;
}

function ChatApp(props: ChatAppProps)
{
    const { chatService, session, startMessage, streaming = true, debug } = props;
    const { chatServiceOptions } = session;

    const [_message, setMessage] = useState("");

    const {
        working,
        handleInput,
        action,
        selected,
        chatHistory,
        handleSendHistory,
        tokenUsage,
    } = useChatController({
        chatService,
        session,
        streaming,
    });

    useEffect(() =>
    {
        if (startMessage)
        {
            handleSendHistory([...chatHistory.messages, new HumanMessage(startMessage)]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendMessage = () =>
    {
        if (_message.trim() && !working)
        {
            const messages = [...chatHistory.messages, new HumanMessage(_message)];
            handleSendHistory(messages, messages.length);
            setMessage("");
        }
    };

    const terminalSize = useTerminalSize();

    return (
        <Box flexDirection="column" width={terminalSize.columns}>

            {/* Messages Area */}
            <Box flexDirection="column" paddingRight={1} width={terminalSize.columns}>
                <Static items={chatHistory.messages.slice(0, chatHistory.finished)}>
                    {(message, index) => (
                        <MemoMessage key={index} msg={message} debug={debug} />
                    )}
                </Static>

                {chatHistory.messages.slice(chatHistory.finished).map((workingItem, index) => (
                    <Message
                        key={index}
                        msg={workingItem}
                        selected={selected === index + chatHistory.finished}
                        debug={debug}
                    />
                ))}
            </Box>

            {/* Input Field */}
            <Box borderStyle="round" paddingX={1} width={terminalSize.columns}>
                <TextInput
                    value={action ? "" : _message}
                    onChange={setMessage}
                    onSubmit={handleSendMessage}
                    placeholder={`> ${action || "How can I help you?"}`}
                    placeholderColor={action ? chalk.red : chalk.blackBright}
                    onHandleInput={handleInput}
                />
            </Box>

            {/* Footer */}
            <Box paddingX={1}>
                {session.toolMode !== "confirm" && <Box flexShrink={0} paddingRight={1}>
                    <Badge
                        color={session.toolMode === "yolo" ? "red" : "whiteBright"}
                        textColor={session.toolMode === "yolo" ? "white" : "blue"}
                    >
                        {session.toolMode.toLocaleUpperCase()}
                    </Badge>
                </Box>}

                <Spinner empty={!working} color={!working ? "blackBright" : "blue"}>
                    {!working
                        ? <Text color="green">{chatServiceOptions.provider}/{chatServiceOptions.model}</Text>
                        : "(working)"
                    }
                    {!working && chatServiceOptions.contextSize &&
                        <Text> (ctx:{chatServiceOptions.contextSize})</Text>
                    }
                </Spinner>

                <Box flexShrink={0} paddingLeft={1}>
                    <Text color="blackBright">[{session.workDir.replace(homedir(), "~")}]</Text>
                </Box>

                {tokenUsage && (tokenUsage.total_tokens / 1000 >= 1) &&
                    <Box flexShrink={0} paddingLeft={1}>
                        <Text color="magenta">
                            TOK {(tokenUsage.total_tokens / 1000).toFixed(1)}
                            (↑{(tokenUsage.input_tokens / 1000).toFixed(1)} ↓{(tokenUsage.output_tokens / 1000).toFixed(1)})
                        </Text>
                    </Box>
                }
            </Box>
        </Box>
    );
}

export default ChatApp;
