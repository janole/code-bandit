import * as vscode from "vscode";

import { autofillCommitMessage } from "./commands/autofill-commit-message.js";

export function activate(context: vscode.ExtensionContext)
{
    const disposable = vscode.commands.registerCommand(
        "code-bandit.autofillCommitMessage",
        autofillCommitMessage
    );

    context.subscriptions.push(disposable);
}

export function deactivate()
{
}