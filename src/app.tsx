import { HumanMessage } from "@langchain/core/messages";
import { Box, Key, Static, Text, useApp } from "ink";
import React, { useEffect, useState } from "react";

import { ChatSession } from "./ai/chat-session.js";
import ErrorMessage from "./ai/error-message.js";
import { TMessage, work } from "./ai/work.js";
import MemoMessage, { Message } from "./ui/message.js";
import Spinner from "./ui/spinner.js";
import TextInput from "./ui/text-input.js";
import useTerminalSize from "./utils/use-terminal-size.js";

interface UseAppInputHandlerProps
{
	session: ChatSession;
	working: boolean;
}

function useAppInputHandler(props: UseAppInputHandlerProps)
{
	const { session, working } = props;

	const { exit } = useApp();

	const [abortController, setAbortController] = useState<AbortController>();
	const [ctrlC, setCtrlC] = useState(false);

	const [_, setReadOnly] = useState(session.readOnly);

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

		if (key.ctrl && input === "w")
		{
			setReadOnly(readOnly => (session.readOnly = !readOnly));

			return true;
		}

		return false;
	};

	const createAbortController = () => 
	{
		const abortController = new AbortController();
		setAbortController(abortController);
		return abortController;
	}

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

	const action = ctrlC
		? working
			? abortController === null
				? "Cancelled. Please wait ..."
				: "Cancel? Press Ctrl-C again ..."
			: "Quit? Press Ctrl-C again ..."
		: undefined;

	return {
		handleInput,
		action,
		createAbortController,
	};
}

interface ChatAppProps
{
	session: ChatSession;
	debug?: boolean;
}

function ChatApp(props: ChatAppProps)
{
	const { session, debug } = props;
	const { chatServiceOptions } = session;

	const [_message, setMessage] = useState("");
	const [chatHistory, setChatHistory] = useState<TMessage[]>(session.messages);

	const [working, setWorking] = useState(false);

	const { handleInput, action, createAbortController } = useAppInputHandler({ session, working });

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
				signal: createAbortController().signal,
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
			<Box flexDirection="column" paddingX={1} width={terminalSize.columns}>
				<Static items={items}>
					{(message, index) => (
						<MemoMessage key={index} msg={message} debug={debug} />
					)}
				</Static>

				{!!workingItem &&
					<Message msg={workingItem} />
				}
			</Box>

			{/* Input Field */}
			<Box borderStyle="round" paddingX={1} width={terminalSize.columns}>
				<TextInput
					value={action ? "" : _message}
					onChange={setMessage}
					onSubmit={handleSendMessage}
					placeholder={`> ${action || "How can I help you?"}`}
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

				<Text color={session.readOnly ? "blue" : "red"}>
					{` [${session.readOnly ? "READ ONLY" : "WRITE MODE"}]`}
				</Text>
			</Box>
		</Box>
	);
}

export default ChatApp;
