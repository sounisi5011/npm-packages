import { Nonce } from '../../src/nonce';
import { padEndArray } from '../helpers';

const tooSmallFixedField = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
const tooLargeFixedField = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];

describe('class Nonce', () => {
    describe('create()', () => {
        it.each([9, 10, 11, 12, 13, 14, 15])('byteLength: %i', len => {
            const nonceState = new Nonce();
            const nonce = nonceState.create(len); // invocation: 0
            expect(nonce.byteLength).toBe(len);
            const currentFixedField = nonce.subarray(0, 7);
            expect(nonce).toStrictEqual(
                Buffer.from(padEndArray([...currentFixedField, 0x00, 0x00], len, 0)),
            );

            // invocation: 1
            expect(nonceState.create(len)).toStrictEqual(
                Buffer.from(padEndArray([...currentFixedField, 0x01, 0x00], len, 0)),
            );

            // invocation: 2
            expect(nonceState.create(len)).toStrictEqual(
                Buffer.from(padEndArray([...currentFixedField, 0x02, 0x00], len, 0)),
            );

            // invocation: 3
            expect(nonceState.create(len)).toStrictEqual(
                Buffer.from(padEndArray([...currentFixedField, 0x03, 0x00], len, 0)),
            );
        });

        it.each([0, 1, 2, 3, 4, 5, 6, 7, 8])('too short biteLength: %i', len => {
            const nonceState = new Nonce();
            expect(() => nonceState.create(len)).toThrowWithMessage(
                RangeError,
                `The value of "byteLength" argument is too short. It must be >= 9 and <= 15. Received ${len}`,
            );
        });

        it.each([16, 17, 18, 19, 20, 21, 22, 23, 24])('too long biteLength: %i', len => {
            const nonceState = new Nonce();
            expect(() => nonceState.create(len)).toThrowWithMessage(
                RangeError,
                `The value of "byteLength" argument is too long. It must be >= 9 and <= 15. Received ${len}`,
            );
        });
    });

    describe('updateInvocation()', () => {
        describe('update state', () => {
            it('fixed field value is too large', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0
                nonceState.create(9); // invocation: 1
                nonceState.create(9); // invocation: 2
                nonceState.create(9); // invocation: 3
                // invocation: 4
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x04, 0x00]),
                );

                // invocation: 4 -> 0 because currentFixedField < tooLargeFixedField
                nonceState.updateInvocation(
                    Buffer.from([...tooLargeFixedField, 0x00, 0x00]),
                );
                // invocation: 1
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...tooLargeFixedField, 0x01, 0x00]),
                );
            });
            it('invocation field value is too large', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0
                nonceState.create(9); // invocation: 1
                nonceState.create(9); // invocation: 2
                // invocation: 3
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x03, 0x00]),
                );

                // invocation: 3 -> 42 because 3 < 4
                nonceState.updateInvocation(
                    Buffer.from([...currentFixedField, 0x42, 0x00]),
                );
                // invocation: 43
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x43, 0x00]),
                );
            });
        });
        describe('should not update state', () => {
            it('fixed field value is too small', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0
                // invocation: 1
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x01, 0x00]),
                );

                // can not update invocation because not currentFixedField < tooSmallFixedField
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0xFE]),
                );
                // invocation: 2
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x02, 0x00]),
                );

                // can not update invocation
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0x02]),
                );
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0x03]),
                );
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0x04]),
                );
                // invocation: 3
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x03, 0x00]),
                );

                // can not update invocation
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0x04]),
                );
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0x05]),
                );
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0x06]),
                );
                nonceState.updateInvocation(
                    Buffer.from([...tooSmallFixedField, 0x07]),
                );
                // invocation: 4
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x04, 0x00]),
                );
            });
            it('invocation field value is too small', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0
                nonceState.create(9); // invocation: 1
                nonceState.create(9); // invocation: 2
                nonceState.create(9); // invocation: 3
                nonceState.create(9); // invocation: 4
                nonceState.create(9); // invocation: 5
                // invocation: 6
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x06, 0x00]),
                );

                // can not update invocation because equals fixed field and not 6 < 2
                nonceState.updateInvocation(
                    Buffer.from([...currentFixedField, 0x02, 0x00]),
                );
                // invocation: 7
                expect(nonceState.create(9)).toStrictEqual(
                    Buffer.from([...currentFixedField, 0x07, 0x00]),
                );
            });
        });
        describe('too short bite length', () => {
            it.each([0, 1, 2, 3, 4, 5, 6, 7])('%i bytes', len => {
                const nonceState = new Nonce();
                expect(() => nonceState.updateInvocation(new Uint8Array(len))).toThrowWithMessage(
                    RangeError,
                    `The value of "prevNonce" argument has too short byte length. It must be >= 8 and <= 15. Received ${len}`,
                );
            });
        });
        it.each([8, 9, 10, 11, 12, 13, 14, 15])('%i bytes', len => {
            const nonceState = new Nonce();
            expect(() => nonceState.updateInvocation(new Uint8Array(len))).not.toThrow();
        });
        describe('too long bite length', () => {
            it.each([16, 17, 18, 19, 20, 21, 22, 23, 24])('%i bytes', len => {
                const nonceState = new Nonce();
                expect(() => nonceState.updateInvocation(new Uint8Array(len))).toThrowWithMessage(
                    RangeError,
                    `The value of "prevNonce" argument has too long byte length. It must be >= 8 and <= 15. Received ${len}`,
                );
            });
        });
        it('properly handle subarrays', () => {
            const nonceState = new Nonce();
            nonceState.updateInvocation(
                Buffer.from([...tooLargeFixedField, 0x02, 0x01, 0x06, 0x02])
                    .subarray(0, tooLargeFixedField.length + 2),
            );
            expect(nonceState.create(tooLargeFixedField.length + 4)).toStrictEqual(
                Buffer.from([...tooLargeFixedField, 0x03, 0x01, 0x00, 0x00]),
            );
        });
    });

    it('increment 64-bit invocation field', () => {
        const nonceState = new Nonce();
        nonceState.updateInvocation(
            Buffer.from([...tooLargeFixedField, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(nonceState.create(tooLargeFixedField.length + 8)).toStrictEqual(
            Buffer.from([...tooLargeFixedField, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(nonceState.create(tooLargeFixedField.length + 8)).toStrictEqual(
            Buffer.from([...tooLargeFixedField, 0x02, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
    });

    it('increment fixed field if invocation field overflows', () => {
        const nonceState = new Nonce();
        nonceState.updateInvocation(
            Buffer.from([0x00, ...tooLargeFixedField.slice(1), 0xFE, 0xFF]),
        );
        expect(nonceState.create(9)).toStrictEqual(
            Buffer.from([0x00, ...tooLargeFixedField.slice(1), 0xFF, 0xFF]),
        );
        // If the invocation field overflows, increment the fixed field.
        expect(nonceState.create(9)).toStrictEqual(
            Buffer.from([0x01, ...tooLargeFixedField.slice(1), 0x00, 0x00]),
        );
        expect(nonceState.create(9)).toStrictEqual(
            Buffer.from([0x01, ...tooLargeFixedField.slice(1), 0x01, 0x00]),
        );
        // Incrementing the fixed field is kept even if there is space for more bytes in the invocation field.
        expect(nonceState.create(10)).toStrictEqual(
            Buffer.from([0x01, ...tooLargeFixedField.slice(1), 0x02, 0x00, 0x00]),
        );
    });

    it('increment fixed field if 64-bit invocation field overflows', () => {
        const nonceState = new Nonce();
        nonceState.updateInvocation(
            Buffer.from([0x00, ...tooLargeFixedField.slice(1), 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(nonceState.create(15)).toStrictEqual(
            Buffer.from([0x00, ...tooLargeFixedField.slice(1), 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(nonceState.create(15)).toStrictEqual(
            Buffer.from([0x01, ...tooLargeFixedField.slice(1), 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        );
        expect(nonceState.create(15)).toStrictEqual(
            Buffer.from([0x01, ...tooLargeFixedField.slice(1), 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        );
        expect(nonceState.create(15)).toStrictEqual(
            Buffer.from([0x01, ...tooLargeFixedField.slice(1), 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
        );
        expect(nonceState.create(9)).toStrictEqual(
            Buffer.from([0x01, ...tooLargeFixedField.slice(1), 0x03, 0x00]),
        );
    });

    it('in the distant future, if fixed and invocation fields overflow', () => {
        const nonceState = new Nonce();
        const fixedField = padEndArray([], 7, 0xFF);

        nonceState.updateInvocation(
            Buffer.from([...fixedField, 0xFE, 0xFF]),
        );
        expect(nonceState.create(9)).toStrictEqual(
            Buffer.from([...fixedField, 0xFF, 0xFF]),
        );
        expect(() => nonceState.create(9)).toThrowWithMessage(
            Error,
            `Unable to create nonce. All bits are overflowing. Please increase the nonce bytes from current value. Received 9`,
        );

        // If the nonce bytes are increased, errors will no longer occur.
        expect(nonceState.create(10)).toStrictEqual(
            Buffer.from([...fixedField, 0x00, 0x00, 0x01]),
        );
        expect(nonceState.create(10)).toStrictEqual(
            Buffer.from([...fixedField, 0x01, 0x00, 0x01]),
        );
        expect(nonceState.create(10)).toStrictEqual(
            Buffer.from([...fixedField, 0x02, 0x00, 0x01]),
        );

        nonceState.updateInvocation(
            Buffer.from([...fixedField, 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(nonceState.create(15)).toStrictEqual(
            Buffer.from([...fixedField, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(() => nonceState.create(15)).toThrowWithMessage(
            Error,
            `Unable to create nonce. All bits are overflowing`,
        );
    });
});
