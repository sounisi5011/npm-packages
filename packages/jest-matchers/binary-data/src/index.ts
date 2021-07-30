import { matchers } from './matchers';

type MatcherFn<T extends jest.CustomMatcher, R> = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends ((...args: [any, ...infer P]) => unknown) ? (...args: P) => R : never
);

expect.extend(matchers);
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeByteSize: MatcherFn<typeof matchers.toBeByteSize, R>;
            toBeGreaterThanByteSize: MatcherFn<typeof matchers.toBeGreaterThanByteSize, R>;
            toBeGreaterThanOrEqualByteSize: MatcherFn<typeof matchers.toBeGreaterThanOrEqualByteSize, R>;
            toBeLessThanByteSize: MatcherFn<typeof matchers.toBeLessThanByteSize, R>;
            toBeLessThanOrEqualByteSize: MatcherFn<typeof matchers.toBeLessThanOrEqualByteSize, R>;
        }
    }
}
