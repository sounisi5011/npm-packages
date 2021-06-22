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

const readFileAsync = async (filepath: string): Promise<string | null> =>
    await fixNodePrimordialsError(
        fsPromises.readFile(filepath, 'utf8')
            .catch((error: Error & Record<string, unknown>) => {
                if (error['code'] === 'ENOENT') return null;
                throw error;
            }),
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

async function createPidFile({ pidFileFullpath, pid }: Readonly<{ pidFileFullpath: string; pid: number }>): Promise<
    | { success: true }
    | { success: false; writeFail: true; existPid?: undefined }
    | { success: false; writeFail?: false; existPid: number }
> {
    const pidFileContent = `${pid}\n`;

    while (!await createFile(pidFileFullpath, pidFileContent)) {
        const existPidFileContent = await readFileAsync(pidFileFullpath);
        if (existPidFileContent === null) continue;

        const existPid = parsePidFile(existPidFileContent);
        if (typeof existPid === 'number' && (existPid === pid || await isPidExist(existPid))) {
            return { success: false, existPid };
        }

        await writeFileAtomic(pidFileFullpath, pidFileContent);
        break;
    }

    const writedPidFileContent = await readFileAsync(pidFileFullpath);
    return writedPidFileContent === pidFileContent ? { success: true } : { success: false, writeFail: true };
}

export interface Options {
    pid?: number;
}

export async function isProcessExist(pidFilepath: string, { pid = process.pid }: Options): Promise<boolean> {
    const pidFileFullpath = resolvePath(pidFilepath);

    while (true) {
        const result = await createPidFile({ pidFileFullpath, pid });
        if (result.success) {
            onExit(() => {
                unlinkSync(pidFileFullpath);
            });
            return false;
        }

        if (result.writeFail) continue;
        return result.existPid !== pid;
    }
}
