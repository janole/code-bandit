import React, { memo, useState } from "react";
import { Box, Newline, Static, Text } from "ink";
import TextInput from "ink-text-input";
import { TMessage, work } from "./ai/work.js";
import { AIMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import useTerminalSize from "./utils/use-terminal-size.js";
import { ToolCall } from "@langchain/core/messages/tool";

const colors = {
	human: "green",
	ai: "black",
	generic: "black",
	tool: "red",
};

function MessageText({ msg }: { msg: TMessage })
{
	const type = msg.getType();
	const color = type in colors ? colors[type as keyof typeof colors] : "black";

	if (["ai", "generic", "human"].includes(type) && msg.text.length > 0)
	{
		return <Text color={color}>{msg.text}</Text>;
	}

	return null;
}

function ToolCallDisplay({ toolCall }: { toolCall: ToolCall })
{
	return (
		<Box borderStyle="single" borderColor="red" paddingX={1} width="100%">
			<Text color="red">
				Tool: {toolCall.name}({Object.entries(toolCall.args).map(([name, value]) =>
					`${name}: ${value.toString().slice(0, 60)}`
				).join(", ")})
			</Text>
		</Box>
	);
}

function ToolCalls({ msg }: { msg: TMessage })
{
	const aiMessage: AIMessage | undefined = msg.getType() === "ai" ? msg : undefined;

	if (!aiMessage?.tool_calls?.length)
	{
		return null;
	}

	return (
		<Box flexDirection="column" width="100%">
			{aiMessage?.tool_calls?.map((toolCall, index) => (
				<ToolCallDisplay key={toolCall.id ?? index} toolCall={toolCall} />
			))}
		</Box>
	);
};

const ToolMessageDisplay = ({ msg }: { msg: ToolMessage }) => (
	<Text color={colors.tool}>
		Tool: {msg.name}
		<Newline />
		{JSON.stringify(msg)}
	</Text>
);

function Message({ msg, debug }: { msg: TMessage; debug?: boolean; })
{
	return (
		<Box flexDirection="column" paddingBottom={1} width="100%">
			<MessageText msg={msg} />
			<ToolCalls msg={msg} />
			{debug && msg.getType() === "tool" &&
				<ToolMessageDisplay msg={msg as ToolMessage} />
			}
		</Box>
	);
}

const MemoMessage = memo(Message);

interface ChatAppProps
{
	workDir: string;
	provider: "ollama" | "openai";
	model: string;
	debug?: boolean;
}

function ChatApp(props: ChatAppProps)
{
	const { workDir, provider, model, debug } = props;

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
				provider,
				model,
				messages,
				send: (messages: TMessage[]) => setChatHistory(messages),
			})
				.finally(() => { setWorking(false); });
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
						<MemoMessage key={message.id ?? index} msg={message} debug={debug} />
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
						placeholder="Type your message ..."
					/>
				</Box>
			</Box>

			{/* Footer */}
			<Box paddingX={1}>
				<Text color="gray">Press Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
}

export default ChatApp;
