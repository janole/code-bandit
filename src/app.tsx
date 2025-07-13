import { HumanMessage, mapChatMessagesToStoredMessages } from "@langchain/core/messages";
import { writeFileSync } from "fs";
import { Box, Static, Text } from "ink";
import TextInput from "ink-text-input";
import React, { useEffect, useState } from "react";

import { IChatServiceOptions } from "./ai/chat-service.js";
import ErrorMessage from "./ai/error-message.js";
import { TMessage, work } from "./ai/work.js";
import MemoMessage, { Message } from "./ui/message.js";
import Spinner from "./ui/spinner.js";
import useTerminalSize from "./utils/use-terminal-size.js";

interface ChatAppProps
{
	workDir: string;
	chatServiceOptions: IChatServiceOptions;
	debug?: boolean;
}

function ChatApp(props: ChatAppProps)
{
	const { workDir, chatServiceOptions, debug } = props;

	const [working, setWorking] = useState(false);
	const [_message, setMessage] = useState("");
	const [chatHistory, setChatHistory] = useState<TMessage[]>([]);

	const handleSendMessage = () =>
	{
		if (_message.trim() && !working)
		{
			const humanMessage = new HumanMessage(_message);

			const messages = [...chatHistory, humanMessage];

			setChatHistory(messages);
			setMessage("");
			setWorking(true);

			work({
				workDir,
				chatServiceOptions,
				messages,
				send: (messages: TMessage[]) => setChatHistory(messages),
			})
				.catch(error => 
				{
					setChatHistory(messages => ([
						...messages,
						new ErrorMessage(`ERROR: running work({...}) failed with: ${error.message || error.toString()}`),
					]));
				})
				.finally(() => 
				{
					setWorking(false);
				});
		}
	};

	const terminalSize = useTerminalSize();

	const { items, workingItem } = working
		? { items: chatHistory.slice(0, -1), workingItem: chatHistory[chatHistory.length - 1] }
		: { items: chatHistory };

	return (
		<Box flexDirection="column" width={terminalSize.columns}>

			{/* Messages Area */}
			<Box flexDirection="column" paddingX={1} width="100%">
				<Static items={items}>
					{(message, index) => (
						<MemoMessage key={message.id + index.toString()} msg={message} debug={debug} />
					)}
				</Static>

				{!!workingItem &&
					<Message msg={workingItem} />
				}
			</Box>

			{/* Input Field */}
			<Box borderStyle="round" paddingX={1} flexShrink={0}>
				<Box>
					<Text color="cyan">{"> "}</Text>
					<TextInput
						value={_message}
						onChange={setMessage}
						onSubmit={handleSendMessage}
						placeholder="How can I help you?"
					/>
				</Box>
			</Box>

			{/* Footer */}
			<Box paddingX={1}>
				<Spinner empty={!working} color={!working ? "gray" : "blue"}>
					{!working
						? <Text color="green">{chatServiceOptions.provider}/{chatServiceOptions.model}</Text>
						: "(working)"
					}
					{!working && chatServiceOptions.contextSize &&
						<Text> (ctx:{chatServiceOptions.contextSize})</Text>
					}
				</Spinner>
			</Box>
		</Box>
	);
}

export default ChatApp;
