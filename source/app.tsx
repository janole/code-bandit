import React, { memo, useState } from 'react';
import { Box, Newline, Static, Text } from 'ink';
import TextInput from 'ink-text-input';
import { TMessage, work } from './ai/work.js';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import useTerminalSize from './utils/use-terminal-size.js';
import { ToolCall } from '@langchain/core/messages/tool';

const colors = {
	human: 'green',
	ai: 'black',
	generic: 'black',
	tool: 'red',
};

const ToolCallDisplay = ({ toolCall }: { toolCall: ToolCall }) => (
	<Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1} marginBottom={1}>
		<Text color="red">
			Tool: {toolCall.name}({Object.entries(toolCall.args).map(([name, value]) => `${name}: ${value}`).join(', ')})
		</Text>
	</Box>
);

const MessageText = ({ msg, type }: { msg: TMessage; type: string }) =>
{
	const color = type in colors ? colors[type as keyof typeof colors] : 'black';

	if (["ai", "generic", "human"].includes(type) && msg.text.length > 0)
	{
		return <Text color={color}>{msg.text}</Text>;
	}

	return null;
};

const ToolMessageDisplay = ({ msg }: { msg: ToolMessage }) => (
	<Text color={colors.tool}>
		Tool: {msg.name}
		<Newline />
		{JSON.stringify(msg)}
	</Text>
);

interface MessageProps
{
	msg: TMessage;
}

function Message(props: MessageProps)
{
	const { msg } = props;

	const type = msg.getType();

	return (
		<Box flexDirection="column" paddingBottom={1} width="100%">
			<MessageText msg={msg} type={type} />

			{ // @ts-ignore
				msg.tool_calls?.map((toolCall: ToolCall, index) => (
					<ToolCallDisplay key={toolCall.id ?? index} toolCall={toolCall} />
				))
			}
			{type === "tool" &&
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
}

const ChatApp = (props: ChatAppProps) =>
{
	const { workDir, provider, model } = props;

	const [working, setWorking] = useState(false);
	const [_message, setMessage] = useState('');
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
		<Box flexDirection="column" width={terminalSize.columns - 1} paddingBottom={1}>

			{/* Messages Area */}
			<Box flexDirection="column" paddingX={1} width="100%">
				<Static items={items}>
					{(message, index) => (
						<MemoMessage key={message.id ?? index} msg={message} />
					)}
				</Static>

				{!!workingItem &&
					<Message msg={workingItem} />
				}
			</Box>

			{/* Input Field */}
			<Box borderStyle="round" paddingX={1} flexShrink={0}>
				<Box>
					<Text color="cyan">{'> '}</Text>
					<TextInput
						value={_message}
						onChange={setMessage}
						onSubmit={handleSendMessage}
						placeholder="Type your message..."
					/>
				</Box>

				<Box>
					<Text color="blue">[Enter to Send]</Text>
				</Box>
			</Box>

			{/* Footer */}
			<Box paddingX={1}>
				<Text color="gray">Press Ctrl+C to exit</Text>
			</Box>
		</Box>
	);
};

export default ChatApp;
