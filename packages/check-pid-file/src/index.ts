import { promises as fsPromises, unlinkSync } from 'fs';
import { resolve as resolvePath } from 'path';

import findProcess from 'find-process';
import onExit from 'signal-exit';
import writeFileAtomic from 'write-file-atomic';

async function fixNodePrimordialsError<T>(promise: Promise<T>): Promise<T> {
    return await promise.catch((oldError: Error) => {
        if (oldError instanceof Error && typeof oldError.stack === 'string') {
            throw oldError;
        }

        const newError = new Error(oldError.message);
        const { message: _1, stack: _2, ...oldErrorProperties } = Object.getOwnPropertyDescriptors(oldError);
        Object.defineProperties(newError, oldErrorProperties);
        throw newError;
    });
}

const readFileAsync = async (filepath: string): Promise<string> =>
    await (
        fixNodePrimordialsError(fsPromises.readFile(filepath, 'utf8'))
    );

async function createFile(filepath: string, data: string | Buffer | Uint8Array): Promise<boolean> {
    return await fixNodePrimordialsError(
        fsPromises.writeFile(filepath, data, { flag: 'wx' })
            .then(() => true)
            .catch((error: Error & Record<string, unknown>) => {
                if (error['code'] === 'EEXIST') return false;
                throw error;
            }),
    );
}

async function isPidExist(pid: number): Promise<boolean> {
    return (await findProcess('pid', pid)).length > 0;
}

function parsePidFile(pidFileContent: string): number | null {
    const pidStr = pidFileContent.trim();
    return /^[0-9]+$/.test(pidStr) ? Number(pidStr) : null;
}

async function checkPidFileUpdateSuccessed(pidFilepath: string, pid: number): Promise<boolean> {
    const pidFileContent = await readFileAsync(pidFilepath);
    return parsePidFile(pidFileContent) === pid;
}

export interface Options {
    pid?: number;
}

export async function isProcessExist(pidFilepath: string, { pid = process.pid }: Options): Promise<boolean> {
    pidFilepath = resolvePath(pidFilepath);
    const pidFileContent = `${pid}\n`;

    if (!(await createFile(pidFilepath, pidFileContent))) {
        const savedPid = parsePidFile(await readFileAsync(pidFilepath));
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
    return !result;
}
