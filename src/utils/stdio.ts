export const hasStdin = !process.stdin.isTTY;

export async function readAllStdin(): Promise<string>
{
    return new Promise((resolve) =>
    {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", chunk => data += chunk);
        process.stdin.on("end", () => resolve(data));
    });
}
