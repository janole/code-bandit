import { useEffect, useState } from "react";
import { useStdout } from "ink";

export default function useTerminalSize()
{
    const { stdout } = useStdout();

    const [size, setSize] = useState({
        columns: stdout.columns || 80,
        rows: stdout.rows || 25,
    });

    useEffect(() =>
    {
        const handleResize = () =>
        {
            setSize({
                columns: stdout.columns,
                rows: stdout.rows,
            });
        };

        stdout.on("resize", handleResize);

        return () => { stdout.off("resize", handleResize); };
    }, [
        setSize,
        stdout,
    ]);

    return size;
}
