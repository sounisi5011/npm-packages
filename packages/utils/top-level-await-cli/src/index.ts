export default async function awaitMainFn(mainFn: (() => Promise<void>) | Promise<void>): Promise<void> {
    const mainResult = typeof mainFn === 'function' ? mainFn() : mainFn;
    return await mainResult.catch(error => {
        if (typeof process.exitCode !== 'number' || process.exitCode === 0) {
            process.exitCode = 1;
        }
        console.error(error);
    });
}

export {
    awaitMainFn,
    awaitMainFn as awaitFn,
    awaitMainFn as awaitFunc,
    awaitMainFn as awaitFunction,
    awaitMainFn as awaitMainFunc,
    awaitMainFn as awaitMainFunction,
    awaitMainFn as topLevelAwait,
    awaitMainFn as topLevelAwaitCli,
};
