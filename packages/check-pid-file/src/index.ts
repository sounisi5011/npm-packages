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
        // @ts-expect-error TS2322: Type '{ [x: string]: PropertyDescriptor; name: TypedPropertyDescriptor<string>; }' is not assignable to type 'PropertyDescriptorMap'.
        // Note: TypeScript 4.7.2 reports this type error.
        //       However, we should be able to assign this type to the type PropertyDescriptorMap.
        //       Probably a TypeScript bug, so disable this error.
        //       https://github.com/microsoft/TypeScript/issues/49235
        const newErrorProperties: PropertyDescriptorMap = oldErrorProperties;
        Object.defineProperties(newError, newErrorProperties);
        throw newError;
    });
}

async function readFileAsync(filepath: string): Promise<Buffer | null> {
    return await fixNodePrimordialsError(
        fsPromises.readFile(filepath)
            .catch((error: Error & Record<string, unknown>) => {
                if (error['code'] === 'ENOENT') return null;
                throw error;
            }),
    );
}

async function createFile(
    filepath: string,
    data: string | Buffer | Uint8Array,
): Promise<boolean> {
    return await fixNodePrimordialsError(
        fsPromises.writeFile(filepath, data, { flag: 'wx' })
            .then(() => true)
            .catch((error: Error & Record<string, unknown>) => {
                if (error['code'] === 'EEXIST') return false;
                throw error;
            }),
    );
}

async function createOrReadFile(
    filepath: string,
    data: string | Buffer | Uint8Array,
): Promise<
    | { create: true }
    | { create: false; content: Buffer }
> {
    while (!await createFile(filepath, data)) {
        const content = await readFileAsync(filepath);
        if (content === null) continue;
        return { create: false, content };
    }
    return { create: true };
}

async function isPidExist(
    targetPid: number,
    { currentPid }: { currentPid?: number } = {},
): Promise<boolean> {
    return targetPid === currentPid || (await findProcess('pid', targetPid)).length > 0;
}

function parsePidFile(
    pidFileContent: string | null | undefined,
): number | null {
    if (typeof pidFileContent !== 'string') return null;
    const pidStr = pidFileContent.trim();
    return /^[0-9]+$/.test(pidStr) ? Number(pidStr) : null;
}

async function createPidFile(
    { pidFileFullpath, currentPid }: Readonly<{ pidFileFullpath: string; currentPid: number }>,
): Promise<
    | { success: true }
    | { success: false; writeFail: true; existPid?: undefined }
    | { success: false; writeFail?: false; existPid: number }
> {
    const newPidFileContent = `${currentPid}\n`;

    const createResult = await createOrReadFile(pidFileFullpath, newPidFileContent);
    if (!createResult.create) {
        const { content: existPidFileContent } = createResult;

        const existPid = parsePidFile(existPidFileContent.toString('utf8'));
        if (typeof existPid === 'number' && await isPidExist(existPid, { currentPid })) {
            return { success: false, existPid };
        }

        await writeFileAtomic(pidFileFullpath, newPidFileContent);
    }

    const writedPidFileContent = (await readFileAsync(pidFileFullpath))?.toString('utf8');
    const writedPid = parsePidFile(writedPidFileContent);
    return writedPid === currentPid
        ? { success: true }
        : { success: false, writeFail: true };
}

export interface Options {
    /**
     * @default process.pid
     */
    currentPid?: number | undefined;
}

export async function isProcessExist(
    pidFilepath: string,
    options: Options = {},
): Promise<boolean> {
    const pidFileFullpath = resolvePath(pidFilepath);
    const { currentPid = process.pid } = options;

    while (true) {
        const result = await createPidFile({ pidFileFullpath, currentPid });
        if (result.success) {
            onExit(() => {
                unlinkSync(pidFileFullpath);
            });
            return false;
        }

        if (result.writeFail) continue;
        return result.existPid !== currentPid;
    }
}
