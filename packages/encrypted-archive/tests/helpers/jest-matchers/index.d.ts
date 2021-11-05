type MatcherFuncs = typeof import('./matchers');
type ActualArgs<T extends keyof MatcherFuncs> = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MatcherFuncs[T] extends ((...args: [any, ...infer P]) => unknown) ? P : never
);

declare namespace jest {
    interface Matchers<R> {
        toThrowWithMessageFixed: (...args: ActualArgs<'toThrowWithMessageFixed'>) => R;
    }
}
