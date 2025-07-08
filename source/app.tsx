import React, { useState } from 'react';
import { Box, Newline, Text } from 'ink';
import TextInput from 'ink-text-input';
import { TMessage, work } from './work.js';
import { HumanMessage, ToolMessage } from '@langchain/core/messages';

const ChatApp = (props: { workDir: string }) =>
{
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

			work({ workDir: props.workDir, messages, send }); // .then(messages => setChatHistory(messages));

			// In a real app, you'd send this message to a server or process it.
			// For this example, we'll just log it.
			// console.log('Sent:', message); // This will be visible in the terminal *outside* Ink rendering
			setMessage(''); // Clear the input after sending
		}
	};

	return (
		<Box flexDirection="column" minHeight={process.stdout.rows - 2}>
			<Box flexGrow={1} flexDirection="column">
				{chatHistory.map((msg, index) => (
					<Text key={msg.id ?? index}>
						{msg.getType() === "human" &&
							<Text color="green">
								{msg.text}
								<Newline />
							</Text>
						}
						{msg.getType() === "tool" &&
							<Text color="red">
								Tool: {(msg as ToolMessage).name}
								<Newline />
								{JSON.stringify(msg)}
							</Text>
						}
						{["ai", "generic"].includes(msg.getType()) &&
							<Text color="black">
								{msg.text}
							</Text>
						}
					</Text>
				))}
			</Box>

			<Box borderStyle="round" padding={1}>
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
		</Box>
	);
};

export default ChatApp;
