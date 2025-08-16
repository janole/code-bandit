import pty, { IPty, IPtyForkOptions } from "node-pty";
import stripAnsi from "strip-ansi";

interface OnExitProps
{
    name: string;
    history: string[];
    proc: IPty;
    exitCode: number;
    signal?: number;
}

interface IOptions
{
    readTimeout?: number;
    sessionTimeout?: number;
    onExit?: (props: OnExitProps) => void;
    spawnOptions?: IPtyForkOptions;
}

interface Session
{
    proc: IPty;
    buffer: string[];
    history: string[];
}

export class PtyManager
{
    private sessions: Map<string, Session> = new Map();

    constructor() { }

    createSession(name: string, command: string, args: string[] = [], options: IOptions = {}): string
    {
        if (this.sessions.has(name))
        {
            throw new Error(`Session "${name}" already exists`);
        }

        const proc = pty.spawn(command, args, {
            name: "xterm-color",
            cols: 80,
            rows: 30,
            cwd: process.cwd(),
            env: process.env as { [key: string]: string },
            ...options.spawnOptions,
        });

        const buffer: string[] = [];  // recent unread output
        const history: string[] = []; // full output history

        const handleTimeout = () =>
        {
            proc.kill();
        };

        if (options.sessionTimeout && options.sessionTimeout > 0)
        {
            setTimeout(handleTimeout, options.sessionTimeout);
        }

        let readTimeout: NodeJS.Timeout | null = null;

        if (options.readTimeout && options.readTimeout > 0)
        {
            readTimeout = setTimeout(handleTimeout, options.readTimeout);
        }

        proc.onData((data: string) =>
        {
            if (readTimeout)
            {
                clearTimeout(readTimeout);
                readTimeout = setTimeout(handleTimeout, options.readTimeout);
            }

            buffer.push(data);
            history.push(data);
        });

        proc.onExit(({ exitCode, signal }) =>
        {
            if (readTimeout)
            {
                clearTimeout(readTimeout);
            }

            options.onExit?.({ name, history, proc, exitCode, signal });

            // this.sessions.delete(name); // Remove session on exit
        });

        this.sessions.set(name, { proc, buffer, history });

        return name;
    }

    write(name: string, input: string): void
    {
        const session = this.sessions.get(name);
        if (!session) {throw new Error(`Session "${name}" not found`);}
        session.proc.write(input.endsWith("\n") ? input : input + "\n");
    }

    /** Get unread output since last call */
    read(name: string): string
    {
        const session = this.sessions.get(name);
        if (!session) {throw new Error(`Session "${name}" not found`);}
        const output = session.buffer.join("");
        session.buffer.length = 0; // Clear unread buffer
        return output;
    }

    readText(name: string): string
    {
        return stripAnsi(this.read(name));
    }

    /** Get full history of the session */
    getHistory(name: string): string
    {
        const session = this.sessions.get(name);
        if (!session) {throw new Error(`Session "${name}" not found`);}
        return session.history.join("");
    }

    getHistoryText(name: string): string
    {
        return stripAnsi(this.getHistory(name));
    }

    resize(name: string, cols: number, rows: number): void
    {
        const session = this.sessions.get(name);
        if (!session) {throw new Error(`Session "${name}" not found`);}
        session.proc.resize(cols, rows);
    }

    kill(name: string, signal: string = "SIGTERM"): void
    {
        const session = this.sessions.get(name);
        if (!session) {throw new Error(`Session "${name}" not found`);}
        session.proc.kill(signal);
        // this.sessions.delete(name);
    }
}
