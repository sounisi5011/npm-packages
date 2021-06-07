import { promises as fsPromises, unlinkSync } from 'fs';
import { resolve as resolvePath } from 'path';

import findProcess from 'find-process';
import onExit from 'signal-exit';
import writeFileAtomic from 'write-file-atomic';

async function createFile(filepath: string, data: string | Buffer | Uint8Array): Promise<boolean> {
    return await fsPromises.writeFile(filepath, data, { flag: 'wx' })
        .then(() => true)
        .catch((error: Error & Record<string, unknown>) => {
            if (error['code'] === 'EEXIST') return false;
            throw error;
        });
}

async function isPidExist(pid: number): Promise<boolean> {
    return (await findProcess('pid', pid)).length > 0;
}

function parsePidFile(pidFileContent: string): number | null {
    const pidStr = pidFileContent.trim();
    return /^[0-9]+$/.test(pidStr) ? Number(pidStr) : null;
}

async function checkPidFileUpdateSuccessed(pidFilepath: string, pid: number): Promise<boolean> {
    const pidFileContent = await fsPromises.readFile(pidFilepath, 'utf8');
    return parsePidFile(pidFileContent) === pid;
}

export interface Options {
    pid?: number;
}

export async function isProcessExist(pidFilepath: string, { pid = process.pid }: Options): Promise<boolean> {
    pidFilepath = resolvePath(pidFilepath);
    const pidFileContent = `${pid}\n`;

    if (!(await createFile(pidFilepath, pidFileContent))) {
        const savedPid = parsePidFile(await fsPromises.readFile(pidFilepath, 'utf8'));
        if (typeof savedPid !== 'number' || (savedPid !== pid && !(await isPidExist(savedPid)))) {
            await writeFileAtomic(pidFilepath, pidFileContent);
        }
    }

    const result = await checkPidFileUpdateSuccessed(pidFilepath, pid);
    if (result) {
        onExit(() => {
            unlinkSync(pidFilepath);
        });
    }
    return result;
}
