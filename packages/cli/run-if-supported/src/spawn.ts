import spawn from 'cross-spawn';

export async function spawnAsync(
    command: string,
    args: readonly string[],
    options?: Parameters<typeof spawn>[2],
): Promise<{
    exitCode: number | null;
    signal: NodeJS.Signals | null;
}> {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    return await new Promise((resolve, reject) => {
        child.on('exit', (exitCode, signal) => resolve({ exitCode, signal }));
        child.on('close', (exitCode, signal) => resolve({ exitCode, signal }));
        child.on('error', error => reject(error));
    });
}
