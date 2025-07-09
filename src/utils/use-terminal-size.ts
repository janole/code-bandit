import { useEffect, useState } from "react";

export default function useTerminalSize()
{
    const [size, setSize] = useState({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 25,
    });

    useEffect(() =>
    {
        const handleResize = () =>
        {
            setSize({
                columns: process.stdout.columns,
                rows: process.stdout.rows,
            });
        };

        process.stdout.on("resize", handleResize);

        return () => { process.stdout.off("resize", handleResize); };
    }, [
        setSize,
    ]);

    return size;
}
