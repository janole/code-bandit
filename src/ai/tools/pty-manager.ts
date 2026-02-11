import pty, { IPty, IPtyForkOptions } from "node-pty";
import stripAnsi from "strip-ansi";

interface OnDataProps
{
    name: string;
    history: string[];
    proc: IPty;
    data: string;
}

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
    onData?: (props: OnDataProps) => void;
    onExit?: (props: OnExitProps) => void;
    spawnOptions?: IPtyForkOptions;
}

interface Session
{
    proc: IPty;
    buffer: string[];
    history: string[];
    exitCode?: number;
    signal?: number;
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

            options.onData?.({ name, history, proc, data });

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

            const session = this.sessions.get(name);
            if (session)
            {
                session.exitCode = exitCode;
                session.signal = signal;
            }

            // this.sessions.delete(name); // Remove session on exit
        });

        this.sessions.set(name, { proc, buffer, history });

        return name;
    }

    /** Writes a line of text to the session, automatically adding a newline. */
    writeLine(name: string, input: string): void
    {
        const session = this.sessions.get(name);
        if (!session) { throw new Error(`Session "${name}" not found`); }
        session.proc.write(input.endsWith("\n") ? input : input + "\n");
    }

    /** Writes raw data to the session's stdin without modification. */
    writeRaw(name: string, data: string, eof?: boolean): void
    {
        const session = this.sessions.get(name);
        if (!session) { throw new Error(`Session "${name}" not found`); }
        session.proc.write(data);
        eof && session.proc.write("\x04");
    }

    /** Get unread output since last call */
    read(name: string): string
    {
        const session = this.sessions.get(name);
        if (!session) { throw new Error(`Session "${name}" not found`); }
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
        if (!session) { throw new Error(`Session "${name}" not found`); }
        return session.history.join("");
    }

    getHistoryText(name: string): string
    {
        return stripAnsi(this.getHistory(name));
    }

    resize(name: string, cols: number, rows: number): void
    {
        const session = this.sessions.get(name);
        if (!session) { throw new Error(`Session "${name}" not found`); }
        session.proc.resize(cols, rows);
    }

    kill(name: string, signal: string = "SIGTERM"): void
    {
        const session = this.sessions.get(name);
        if (!session) { throw new Error(`Session "${name}" not found`); }
        session.proc.kill(signal);
        // this.sessions.delete(name);
    }

    get(name: string)
    {
        return this.sessions.get(name);
    }

    /**
     * Waits for a session to exit.
     *
     * @param name The name of the session.
     * @param timeout Optional timeout in milliseconds.
     * @returns A promise that resolves with the exit code and signal, or rejects on timeout.
     */
    waitForExit(name: string, timeout?: number): Promise<{ exitCode: number, signal?: number }>
    {
        const session = this.sessions.get(name);
        if (!session)
        {
            return Promise.reject(new Error(`Session "${name}" not found`));
        }

        if (typeof session.exitCode === "number")
        {
            return Promise.resolve({ exitCode: session.exitCode, signal: session.signal });
        }

        return new Promise((resolve, reject) =>
        {
            let timeoutId: NodeJS.Timeout | null = null;

            const disposable = session.proc.onExit(({ exitCode, signal }) =>
            {
                if (timeoutId)
                {
                    clearTimeout(timeoutId);
                }
                disposable.dispose();
                resolve({ exitCode, signal });
            });

            if (timeout && timeout > 0)
            {
                timeoutId = setTimeout(() =>
                {
                    disposable.dispose();
                    reject(new Error(`Timeout waiting for session "${name}" to exit`));
                }, timeout);
            }
        });
    }
}
