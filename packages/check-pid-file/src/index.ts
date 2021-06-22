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

const readFileAsync = async (filepath: string): Promise<Buffer | null> =>
    await fixNodePrimordialsError(
        fsPromises.readFile(filepath)
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

async function createOrUpdateFile<T>(
    filepath: string,
    data: string | Buffer | Uint8Array,
    updateFn: (content: Buffer) => T | PromiseLike<T>,
): Promise<{ create: true } | { create: false; updateResult: T }> {
    while (!await createFile(filepath, data)) {
        const content = await readFileAsync(filepath);
        if (content === null) continue;
        return { create: false, updateResult: await updateFn(content) };
    }
    return { create: true };
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
    const pidFileContent = Buffer.from(`${pid}\n`);

    const result = await createOrUpdateFile(pidFileFullpath, pidFileContent, async existPidFileContent => {
        const existPid = parsePidFile(existPidFileContent.toString('utf8'));
        if (typeof existPid === 'number' && (existPid === pid || await isPidExist(existPid))) {
            return { success: false as const, existPid };
        }

        await writeFileAtomic(pidFileFullpath, pidFileContent);
        return undefined;
    });
    if (!result.create && result.updateResult) return result.updateResult;

    const writedPidFileContent = await readFileAsync(pidFileFullpath);
    return writedPidFileContent?.equals(pidFileContent) ? { success: true } : { success: false, writeFail: true };
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
