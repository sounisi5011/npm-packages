import {
    toBeByteSize,
    toBeGreaterThanByteSize,
    toBeGreaterThanOrEqualByteSize,
    toBeLessThanByteSize,
    toBeLessThanOrEqualByteSize,
} from './matchers';

type MatcherFn<T extends jest.CustomMatcher, R> = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends ((...args: [any, ...infer P]) => unknown) ? (...args: P) => R : never
);

expect.extend({
    toBeByteSize,
    toBeGreaterThanByteSize,
    toBeGreaterThanOrEqualByteSize,
    toBeLessThanByteSize,
    toBeLessThanOrEqualByteSize,
});
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeByteSize: MatcherFn<typeof toBeByteSize, R>;
            toBeGreaterThanByteSize: MatcherFn<typeof toBeGreaterThanByteSize, R>;
            toBeGreaterThanOrEqualByteSize: MatcherFn<typeof toBeGreaterThanOrEqualByteSize, R>;
            toBeLessThanByteSize: MatcherFn<typeof toBeLessThanByteSize, R>;
            toBeLessThanOrEqualByteSize: MatcherFn<typeof toBeLessThanOrEqualByteSize, R>;
        }
    }
}
