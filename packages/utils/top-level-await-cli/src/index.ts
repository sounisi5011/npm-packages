export async function awaitMainFn(mainFnOrValue: (() => PromiseLike<void> | void) | PromiseLike<void>): Promise<void> {
    const mainFn = typeof mainFnOrValue === 'function'
        ? mainFnOrValue
        : () => mainFnOrValue;
    try {
        await mainFn();
    } catch (error) {
        if (typeof process.exitCode !== 'number' || process.exitCode === 0) {
            process.exitCode = 1;
        }
        console.error(error);
    }
}

export {
    awaitMainFn as awaitFn,
    awaitMainFn as awaitFunc,
    awaitMainFn as awaitFunction,
    awaitMainFn as awaitMainFunc,
    awaitMainFn as awaitMainFunction,
    awaitMainFn as topLevelAwait,
    awaitMainFn as topLevelAwaitCli,
};
