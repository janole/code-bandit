import * as vscode from 'vscode';
import { work, ChatSession, FileSessionStorage } from '@janole/code-bandit';

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Bandit VS Code extension is now active!');

    // Register the analyze command
    const analyzeCommand = vscode.commands.registerCommand('code-bandit.analyze', async () => {
        try {
            // Get the current workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Please open a workspace folder first');
                return;
            }

            // Show progress indicator
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Code Bandit",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: "Analyzing your codebase..." });

                try {
                    // Create a session for this workspace
                    const sessionStorage = new FileSessionStorage(workspaceFolder.uri.fsPath);
                    const session = new ChatSession('vscode-extension', sessionStorage);

                    // Analyze the codebase
                    const result = await work(
                        'Please analyze this codebase and provide a brief overview of its structure and purpose.',
                        session
                    );

                    // Show the result in a new document
                    const doc = await vscode.workspace.openTextDocument({
                        content: result,
                        language: 'markdown'
                    });
                    
                    await vscode.window.showTextDocument(doc);
                } catch (error) {
                    console.error('Code Bandit analysis failed:', error);
                    vscode.window.showErrorMessage(`Code Bandit analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            });

        } catch (error) {
            console.error('Command execution failed:', error);
            vscode.window.showErrorMessage(`Command failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    context.subscriptions.push(analyzeCommand);
}

export function deactivate() {
    console.log('Code Bandit VS Code extension is deactivated');
}