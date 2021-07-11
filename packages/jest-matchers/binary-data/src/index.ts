import {
    toBeByteSize,
    toBeGreaterThanByteSize,
    toBeGreaterThanOrEqualByteSize,
    toBeLessThanByteSize,
    toBeLessThanOrEqualByteSize,
} from './matchers';

type ActualArgs<T extends jest.CustomMatcher> = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends ((...args: [any, ...infer P]) => unknown) ? P : never
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
            toBeByteSize: (...args: ActualArgs<typeof toBeByteSize>) => R;
            toBeGreaterThanByteSize: (...args: ActualArgs<typeof toBeGreaterThanByteSize>) => R;
            toBeGreaterThanOrEqualByteSize: (...args: ActualArgs<typeof toBeGreaterThanOrEqualByteSize>) => R;
            toBeLessThanByteSize: (...args: ActualArgs<typeof toBeLessThanByteSize>) => R;
            toBeLessThanOrEqualByteSize: (...args: ActualArgs<typeof toBeLessThanOrEqualByteSize>) => R;
        }
    }
}
