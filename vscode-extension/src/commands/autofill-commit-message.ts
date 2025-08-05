import { AIMessage, ChatService, ChatSession, HumanMessage, work } from "@janole/code-bandit";
import * as vscode from "vscode";

import { getActiveRepository, getStagedInfo } from "../git/api.js";
import { Repository } from "../git/vscode-git.js";

const systemPrompt = `
You are a professional software developer and an expert in using git.

When prompted with a git diff, you will reply with a semantic commit message in the form of:

**Example 1**:

feat: add a new button to download the table data

**Example 2**:

chore: remove unused component

**Example 3**:

fix: change typescript types according to standard

Important rules:

- Do not include any markdown in the commit message
- Do not include any other text than the commit message

`.trim();

type TProgress = vscode.Progress<{ message?: string; increment?: number; }>;

class CommitMessageGenerator
{
    readonly repository: Repository;

    constructor(repository: Repository)
    {
        this.repository = repository;
    }

    private getProgressLocation(): vscode.ProgressLocation
    {
        switch (vscode.workspace.getConfiguration("codeBandit.uI").get("showCommitProgress") || "notification")
        {
            case "statusbar":
                return vscode.ProgressLocation.Window;
            case "none":
                return vscode.ProgressLocation.SourceControl;
            default:
                return vscode.ProgressLocation.Notification;
        }
    }

    async withProgress()
    {
        const options = {
            location: this.getProgressLocation(),
            title: "Creating commit message",
            cancellable: true,
        };

        return vscode.window.withProgress(
            options,
            (progress, token) => this.generateCommitMessage(progress, token),
        );
    }

    private async generateCommitMessage(progress: TProgress, token: vscode.CancellationToken)
    {
        progress.report({ message: "Gathering git diff ..." });

        // Get the prefix from the extension's settings
        const config = vscode.workspace.getConfiguration("codeBandit.aI.models");
        const option = config.get<string>("gitCommit")?.split("/");

        const chatServiceOptions = { provider: "openai", model: "gpt-4.1-mini" };
        if (option?.length === 2)
        {
            chatServiceOptions.provider = option[0];
            chatServiceOptions.model = option[1];
        }

        const abortController = new AbortController();
        token.onCancellationRequested(() => { abortController.abort(); });

        const gitDiff = await getStagedInfo(this.repository);

        if (token.isCancellationRequested) { return; }

        const session = ChatSession.create({
            workDir: this.repository.rootUri.fsPath,
            toolMode: "read-only",
            // @ts-expect-error
            chatServiceOptions,
            systemPrompt,
            messages: [new HumanMessage(gitDiff)],
        });

        progress.report({ message: "Thinking ..." });

        if (token.isCancellationRequested) { return; }

        try
        {
            const reply = await work({ chatService: new ChatService({}), session, signal: abortController.signal });

            if (!reply?.length) { throw new Error("Empty AI response"); }

            const llmGeneratedMessage = (reply[reply.length - 1] as AIMessage).text;

            // fill in commit message
            this.repository.inputBox.value = llmGeneratedMessage;
        }
        catch (e)
        {
            if (abortController.signal.aborted || token.isCancellationRequested) { return; }

            throw e;
        }
    }
}

async function autofillCommitMessage(sourceControl?: vscode.SourceControl)
{
    try
    {
        const repository = await getActiveRepository({ sourceControl });

        if (!repository)
        {
            vscode.window.showErrorMessage("No git repository found.");

            return;
        }

        const generator = new CommitMessageGenerator(repository);

        await generator.withProgress();
    }
    catch (error)
    {
        console.error(error);
        vscode.window.showErrorMessage("An unexpected error occurred. Please check the console for details.");
    }
}

export { autofillCommitMessage };
