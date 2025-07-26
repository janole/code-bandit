import { HumanMessage } from "@langchain/core/messages";
import { Box, Key, Static, Text, useApp } from "ink";
import React, { useEffect, useState } from "react";

import { ChatSession, TToolMode } from "./ai/chat-session.js";
import { ErrorMessage, TMessage, ToolProgressMessage } from "./ai/custom-messages.js";
import { needsToolConfirmation, work } from "./ai/work.js";
import MemoMessage, { Message } from "./ui/messages/message.js";
import { Badge } from "./ui/messages/types.js";
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

	const [_, setToolMode] = useState(session.toolMode);

	const selected = session.messages.findIndex(m => ToolProgressMessage.isTypeOf(m) && m.status === "pending-confirmation");
	const confirm = selected !== -1;

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
			setToolMode(toolMode => session.toolMode = (toolMode === "confirm" ? "read-only" : toolMode === "read-only" ? "yolo" : "confirm"));
			return true;
		}

		return !!confirm; // do not allow input as long as tool-confirmation is needed
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
		: confirm
			? "Please confirm the tool ..."
			: undefined;

	return {
		handleInput,
		action,
		createAbortController,
		selected,
		setToolMode,
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

	const [chatHistory, setChatHistory] = useState<{ messages: TMessage[]; finished: number }>({
		messages: session.messages,
		finished: session.finished || 0,
	});

	const [working, setWorking] = useState(false);

	const { handleInput, action, createAbortController, selected, setToolMode } = useAppInputHandler({ session, working });

	const handleSendHistory = (messages: TMessage[], finished?: number) =>
	{
		setChatHistory(history => ({ messages, finished: Math.max(finished || 0, history.finished) }));
		setWorking(true);

		// TODO: refactor session.messages and setMessage/setState handling
		session.setMessages(messages, messages.length, false);

		work({
			session,
			send: (messages: TMessage[]) => setChatHistory(history => ({ ...history, messages })),
			signal: createAbortController().signal,
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
	}

	const updateMessage = (index: number, msg: TMessage) =>
	{
		const messages = [...chatHistory.messages];
		// TODO: fix inline editing, create new item instead
		messages[index] = msg;

		handleSendHistory(messages);
	};

	const handleSendMessage = () =>
	{
		if (selected !== -1)
		{
			// confirmTool();
			return;
		}

		if (_message.trim() && !working)
		{
			const messages = [...chatHistory.messages, new HumanMessage(_message)];
			handleSendHistory(messages, messages.length);
			setMessage("");
		}
	};

	useEffect(() =>
	{
		!working && session.setMessages(chatHistory.messages, chatHistory.finished);
	}, [
		working,
		session,
		chatHistory.messages,
	]);

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
						updateMessage={(msg: TMessage) => !working && updateMessage(index + chatHistory.finished, msg)}
						setToolMode={(toolMode: TToolMode) => setToolMode(session.toolMode = toolMode)}

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
					onHandleInput={handleInput}
				/>
			</Box>

			{/* Footer */}
			<Box paddingX={1}>
				<Spinner empty={!working} color={!working ? "blackBright" : "blue"}>
					{!working
						? <Text color="green">{chatServiceOptions.provider}/{chatServiceOptions.model}</Text>
						: "(working)"
					}
					{!working && chatServiceOptions.contextSize &&
						<Text> (ctx:{chatServiceOptions.contextSize})</Text>
					}
				</Spinner>

				{session.toolMode !== "confirm" && <>
					<Text>{" "}</Text>
					<Badge
						color={session.toolMode === "yolo" ? "red" : "whiteBright"}
						textColor={session.toolMode === "yolo" ? "white" : "blue"}
					>
						{session.toolMode.toLocaleUpperCase()}
					</Badge>
				</>}
			</Box>
		</Box>
	);
}

export default ChatApp;
