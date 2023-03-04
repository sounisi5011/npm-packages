import { constants as fsConst, promises as fs } from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { promisify } from 'node:util';
import v8 from 'node:v8';

import filenamify from 'filenamify';

const setImmediateAsync = promisify(setImmediate);

export function getDirpath(importMeta: ImportMeta, ...paths: string[]): string {
    return path.resolve(url.fileURLToPath(importMeta.url), '..', ...paths);
}

export function cachedPromise<TArgs extends unknown[], TRet>(
    genPromiseFn: (...args: TArgs) => PromiseLike<TRet>,
): (...args: TArgs) => Promise<TRet> {
    const cacheMap = new Map<string, PromiseLike<TRet>>();
    return async (...args) => {
        let cacheKey: string | undefined;
        try {
            // Stringify the arguments passed using the structured clone algorithm instead of JSON.
            // This allows the arguments to be JavaScript values and recursive objects that cannot be included in JSON.
            // see https://developer.mozilla.org/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
            cacheKey = v8.serialize(args).toString('base64');
        } catch {
            return await genPromiseFn(...args);
        }

        let cachedResult = cacheMap.get(cacheKey);
        if (!cachedResult) {
            cachedResult = genPromiseFn(...args);
            cacheMap.set(cacheKey, cachedResult);
        }

        return await cachedResult;
    };
}

const tempFileRootpath = getDirpath(import.meta, '../.temp');

export async function createTempFile<T>(
    fn: (args: {
        readonly tempFilepath: string;
        readonly readTempFile: () => Promise<string>;
    }) => T,
): Promise<Awaited<T>> {
    let tempFile: { filepath: string; fileHandle: fs.FileHandle } | undefined;
    try {
        await fs.mkdir(tempFileRootpath, { recursive: true });

        /**
         * Open a file with a non-duplicate name
         */
        while (true) {
            try {
                const filepath = path.resolve(tempFileRootpath, Math.random().toString(36).substring(2));
                tempFile = {
                    filepath,
                    fileHandle: await fs.open(
                        filepath,
                        // Open file for reading.
                        // The file is created if it does not exist.
                        // If the path exists, the operation fails.
                        //
                        // This operation is not available for file system flags in string form,
                        // so it is specified using a flag number.
                        // see https://nodejs.org/docs/latest-v16.x/api/fs.html#file-system-flags
                        // see https://github.com/nodejs/node/issues/1592#issuecomment-223819785
                        // see https://github.com/nodejs/node/blob/v16.0.0/lib/internal/fs/utils.js#L554-L594
                        // see https://github.com/nodejs/node/blob/v16.19.1/lib/internal/fs/utils.js#L558-L598
                        fsConst.O_RDONLY | fsConst.O_CREAT | fsConst.O_EXCL,
                        0o600,
                    ),
                };
                break;
            } catch (error) {
                if ((error as Record<PropertyKey, unknown> | null | undefined)?.['code'] !== 'EEXIST') throw error;
                await setImmediateAsync();
            }
        }

        const openedFileHandle = tempFile.fileHandle;
        // eslint-disable-next-line @typescript-eslint/return-await
        return await fn({
            tempFilepath: tempFile.filepath,
            readTempFile: async () => await fs.readFile(openedFileHandle, { encoding: 'utf8' }),
        });
    } finally {
        if (tempFile) {
            await tempFile.fileHandle.close();
            await fs.unlink(tempFile.filepath);
        }
    }
}

export async function createTempDir<T>(
    fn: (args: {
        readonly tempDirpath: string;
        readonly writeFile: (filename: string, data: Parameters<typeof fs.writeFile>[1]) => Promise<void>;
    }) => T,
    options?: {
        /**
         * Name to use for temporary directories
         * If this option is omitted, the directory name is randomly determined by the `fs.mkdtemp()` function
         * The string specified in this option is converted to a safe directory name by `filenamify`
         */
        readonly tempDirname?: string;
        /**
         * This option works only if the `tempDirname` option is specified
         */
        readonly allowDuplicateDir?: boolean;
        /**
         * @default {true}
         */
        readonly autoClean?: boolean;
    },
): Promise<Awaited<T>> {
    const tempDirpathPrefix = options?.tempDirname
        ? path.resolve(tempFileRootpath, filenamify(options?.tempDirname))
        : tempFileRootpath;
    let tempDirpath: string | undefined;
    try {
        if (tempDirpathPrefix !== tempFileRootpath && options?.allowDuplicateDir) {
            tempDirpath = tempDirpathPrefix;
            await fs.mkdir(tempDirpath, { recursive: true });
        } else {
            tempDirpath = await fs.mkdtemp(
                tempDirpathPrefix !== tempFileRootpath
                    ? `${tempDirpathPrefix}--`
                    : `${tempFileRootpath}${path.sep}`,
            );
        }

        const createTempDirpath = tempDirpath;
        const writeFile = async (
            filename: string,
            data: Parameters<typeof fs.writeFile>[1],
        ): Promise<void> => {
            filename = path.normalize(filename);
            if (filename.startsWith(`..${path.sep}`)) {
                throw new RangeError(`Paths outside the directory are not allowed: ${filename}`);
            }
            const filepath = path.resolve(createTempDirpath, filename);
            await fs.mkdir(path.dirname(filepath), { recursive: true });
            await fs.writeFile(filepath, data);
        };

        // eslint-disable-next-line @typescript-eslint/return-await
        return await fn({ tempDirpath, writeFile });
    } finally {
        if (tempDirpath && (options?.autoClean === undefined || options?.autoClean)) {
            await fs.rm(tempDirpath, { recursive: true, force: true });
        }
    }
}
