import React, { memo, useState } from 'react';
import { Box, Newline, Static, Text } from 'ink';
import TextInput from 'ink-text-input';
import { TMessage, work } from './work.js';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';
import useTerminalSize from './useTerminalSize.js';
import { ToolCall } from '@langchain/core/messages/tool';

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
			{["ai", "generic", "human"].includes(type) && msg.text.length > 0 &&
				<Text color={type === "human" ? "green" : "black"}>
					{msg.text}
				</Text>
			}

			{ // @ts-ignore
				msg.tool_calls?.map((toolCall: ToolCall, index) => (
					<Box key={toolCall.id ?? index} flexDirection="column" borderStyle="single" borderColor="red" paddingX={1} marginBottom={1}>
						<Text color="red">
							Tool: {toolCall.name}({Object.entries(toolCall.args).map(([name, value]) => `${name}: ${value}`).join(", ")})
						</Text>
					</Box>
				))
			}

			{type === "tool" &&
				<Text color="red">
					Tool: {(msg as ToolMessage).name}
					<Newline />
					{JSON.stringify(msg)}
				</Text>
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

	const [_message, setMessage] = useState('');
	const [chatHistory, setChatHistory] = useState<TMessage[]>([]);

	const handleSendMessage = () =>
	{
		if (_message.trim())
		{
			const humanMessage = new HumanMessage(_message);

			const messages = [...chatHistory, humanMessage];

			setChatHistory(messages);

			const send = (messages: TMessage[]) => setChatHistory(messages);

			work({
				workDir,
				provider,
				model,
				messages,
				send,
			});

			setMessage('');
		}
	};

	const terminalSize = useTerminalSize();

	return (
		<Box flexDirection="column" width={terminalSize.columns - 1} paddingBottom={1}>

			{/* Messages Area */}
			<Box flexDirection="column" paddingX={1} width="100%">
				<Static items={chatHistory.slice(0, -1)}>
					{(message, index) => (
						<MemoMessage key={message.id ?? index} msg={message} />
					)}
				</Static>
				{!!chatHistory[chatHistory.length - 1] &&
					<Message msg={chatHistory[chatHistory.length - 1] as TMessage} />
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
