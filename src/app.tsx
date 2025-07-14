import { HumanMessage } from "@langchain/core/messages";
import { Box, Key, Static, Text } from "ink";
import React, { useEffect, useState } from "react";

import { ChatSession } from "./ai/chat-session.js";
import ErrorMessage from "./ai/error-message.js";
import { TMessage, work } from "./ai/work.js";
import MemoMessage, { Message } from "./ui/message.js";
import Spinner from "./ui/spinner.js";
import TextInput from "./ui/text-input.js";
import useTerminalSize from "./utils/use-terminal-size.js";

interface ChatAppProps
{
	session: ChatSession;
	debug?: boolean;
}

function ChatApp(props: ChatAppProps)
{
	const { session, debug } = props;
	const { chatServiceOptions } = session;

	const [working, setWorking] = useState(false);
	const [_message, setMessage] = useState("");

	const [chatHistory, setChatHistory] = useState<TMessage[]>(session.messages);
	const [_, setReadOnly] = useState(session.readOnly);

	const handleInput = (input: string, key: Key): boolean =>
	{
		if (key.ctrl && input === "r")
		{
			setReadOnly(readOnly => (session.readOnly = !readOnly));

			return true;
		}

		return false;
	};

	const handleSendMessage = () =>
	{
		if (_message.trim() && !working)
		{
			const humanMessage = new HumanMessage(_message);

			const messages = [...chatHistory, humanMessage];

			setChatHistory(messages);
			setMessage("");
			setWorking(true);

			// TODO: refactor session.messages and setMessage/setState handling
			session.setMessages(messages, false);

			work({
				session,
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

	useEffect(() =>
	{
		!working && session.setMessages(chatHistory);
	}, [
		working,
		session,
		chatHistory,
	]);

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
					<TextInput
						value={_message}
						onChange={setMessage}
						onSubmit={handleSendMessage}
					placeholder="> How can I help you?"
					onHandleInput={handleInput}
					/>
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
