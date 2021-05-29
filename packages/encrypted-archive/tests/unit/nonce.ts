import { Nonce } from '../../src/nonce';
import '../helpers/jest-matchers';
import { padEndArray, rangeArray } from '../helpers';

const tooSmallFixedField = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
const tooLargeFixedField = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01];
const createFixedField = (...fixedFieldDataList: readonly number[]): number[] =>
    padEndArray(fixedFieldDataList, 7, 0x00);

const MIN_NONCE_LENGTH = 7 + 2;
const MIN_INPUT_NONCE_LENGTH = 7 + 1;
const MAX_NONCE_LENGTH = 7 + 8;

describe('class Nonce', () => {
    describe('create()', () => {
        it.each(rangeArray(MIN_NONCE_LENGTH, MAX_NONCE_LENGTH))('byteLength: %i', len => {
            const nonceState = new Nonce();
            const nonce = nonceState.create(len); // invocation: 0
            expect(nonce.byteLength).toBeByteSize(len);
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

        describe('invalid "byteLength" argument', () => {
            describe('too short', () => {
                it.each(rangeArray(0, MIN_NONCE_LENGTH - 1))('%i', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.create(len)).toThrowWithMessageFixed(
                        RangeError,
                        `The value of "byteLength" argument is too short. It must be >= ${MIN_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                    );
                });
            });

            describe('too long', () => {
                it.each(rangeArray(MAX_NONCE_LENGTH + 1, MAX_NONCE_LENGTH + 5))('%i', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.create(len)).toThrowWithMessageFixed(
                        RangeError,
                        `The value of "byteLength" argument is too long. It must be >= ${MIN_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                    );
                });
            });
        });
    });

    describe('createFromInvocationCountDiff()', () => {
        describe('create from invocationCount diff', () => {
            const prevNonce = new Uint8Array([...tooSmallFixedField, 0x00]);

            it.each(rangeArray(1, 9).map(BigInt))('+%i', addInvocationCount => {
                const nonceState = new Nonce();
                const newNonce = nonceState.createFromInvocationCountDiff(prevNonce, addInvocationCount);
                expect([...newNonce]).toStrictEqual([...tooSmallFixedField, Number(addInvocationCount)]);
            });
        });

        describe('increment fixed field', () => {
            const prevNonce = new Uint8Array([...createFixedField(), 0xFE]);
            const table = [
                {
                    addInvocationCount: 1,
                    expected: [...createFixedField(0x00), 0xFF],
                },
                {
                    addInvocationCount: 2,
                    expected: [...createFixedField(0x01), 0x00],
                },
                {
                    addInvocationCount: 3,
                    expected: [...createFixedField(0x01), 0x01],
                },
                {
                    addInvocationCount: 0x100 + 0,
                    expected: [...createFixedField(0x01), 0xFE],
                },
                {
                    addInvocationCount: 0x100 + 1,
                    expected: [...createFixedField(0x01), 0xFF],
                },
                {
                    addInvocationCount: 0x100 + 2,
                    expected: [...createFixedField(0x02), 0x00],
                },
                {
                    addInvocationCount: 0x100 + 3,
                    expected: [...createFixedField(0x02), 0x01],
                },
                {
                    addInvocationCount: 0xFF00 + 0,
                    expected: [...createFixedField(0xFF), 0xFE],
                },
                {
                    addInvocationCount: 0xFF00 + 1,
                    expected: [...createFixedField(0xFF), 0xFF],
                },
                {
                    addInvocationCount: 0xFF00 + 2,
                    expected: [...createFixedField(0x00, 0x01), 0x00],
                },
                {
                    addInvocationCount: 0xFF00 + 3,
                    expected: [...createFixedField(0x00, 0x01), 0x01],
                },
            ];

            it.each<[string, number, number[]]>(table.map(({ addInvocationCount, expected }) => [
                `+0x${addInvocationCount.toString(16).toUpperCase()}`,
                addInvocationCount,
                expected,
            ]))('%s', (_, addInvocationCount, expected) => {
                const nonceState = new Nonce();
                const newNonce = nonceState.createFromInvocationCountDiff(prevNonce, BigInt(addInvocationCount));
                expect([...newNonce]).toStrictEqual(expected);
            });
        });

        it('return value is not affected by state', () => {
            const nonceState = new Nonce();
            const currentNonce = nonceState.create(9);
            const prevNonce = new Uint8Array([...tooSmallFixedField, 0x00]);

            expect([...currentNonce.subarray(0, 7)])
                .not.toStrictEqual([...prevNonce.subarray(0, 7)]);

            const newNonce = nonceState.createFromInvocationCountDiff(prevNonce, BigInt(0x99));
            expect([...newNonce])
                .toStrictEqual([...tooSmallFixedField, 0x99]);
        });

        describe('update state', () => {
            it('fixed field value is too large', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0

                nonceState.create(9); // invocation: 1
                nonceState.create(9); // invocation: 2
                nonceState.create(9); // invocation: 3
                // invocation: 4
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 4, 0x00]);

                // invocation: 4 -> (0 + 1) because currentFixedField < tooLargeFixedField
                expect([...nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooLargeFixedField, 0, 0x00]),
                    BigInt(1),
                )])
                    .toStrictEqual([...tooLargeFixedField, 1, 0x00]);

                // invocation: 2
                expect([...nonceState.create(9)])
                    .toStrictEqual([...tooLargeFixedField, 2, 0x00]);
            });
            it('invocation field value is too large', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0
                nonceState.create(9); // invocation: 1
                nonceState.create(9); // invocation: 2
                // invocation: 3
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 3, 0x00]);

                // invocation: 3 -> 43 because 3 < (42 + 1)
                expect([...nonceState.createFromInvocationCountDiff(
                    Buffer.from([...currentFixedField, 42, 0x00]),
                    BigInt(1),
                )])
                    .toStrictEqual([...currentFixedField, 43, 0x00]);

                // invocation: 44
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 44, 0x00]);

                // invocation: 44 -> 54 because 44 < (4 + 50)
                expect([...nonceState.createFromInvocationCountDiff(
                    Buffer.from([...currentFixedField, 4, 0x00]),
                    BigInt(50),
                )])
                    .toStrictEqual([...currentFixedField, 54, 0x00]);

                // invocation: 55
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 55, 0x00]);
            });
        });

        describe('should not update state', () => {
            it('fixed field value is too small', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0
                // invocation: 1
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x01, 0x00]);

                // can not update invocation because not currentFixedField < tooSmallFixedField
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0xFE]),
                    BigInt(1),
                );
                // invocation: 2
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x02, 0x00]);

                // can not update invocation
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0x02]),
                    BigInt(1),
                );
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0x03]),
                    BigInt(1),
                );
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0x04]),
                    BigInt(1),
                );
                // invocation: 3
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x03, 0x00]);

                // can not update invocation
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0x04]),
                    BigInt(1),
                );
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0x05]),
                    BigInt(1),
                );
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0x06]),
                    BigInt(1),
                );
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...tooSmallFixedField, 0x07]),
                    BigInt(1),
                );
                // invocation: 4
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x04, 0x00]);
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
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x06, 0x00]);

                // can not update invocation because equals fixed field and not 6 < 2
                nonceState.createFromInvocationCountDiff(
                    Buffer.from([...currentFixedField, 0x02, 0x00]),
                    BigInt(1),
                );
                // invocation: 7
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x07, 0x00]);
            });
        });

        describe('invalid "prevNonce" argument', () => {
            describe('too short byte length', () => {
                it.each(rangeArray(0, MIN_INPUT_NONCE_LENGTH - 1))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.createFromInvocationCountDiff(new Uint8Array(len), BigInt(1)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "prevNonce" argument has too short byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });

            describe('valid byte length', () => {
                it.each(rangeArray(MIN_INPUT_NONCE_LENGTH, MAX_NONCE_LENGTH))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.createFromInvocationCountDiff(new Uint8Array(len), BigInt(1)))
                        .not.toThrow();
                });
            });

            describe('too long byte length', () => {
                it.each(rangeArray(MAX_NONCE_LENGTH + 1, MAX_NONCE_LENGTH + 5))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.createFromInvocationCountDiff(new Uint8Array(len), BigInt(1)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "prevNonce" argument has too long byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });
        });

        describe('invalid "addInvocationCount" argument', () => {
            it.each(rangeArray(-5, 0).map(BigInt))('%i', addInvocationCount => {
                const nonceState = new Nonce();
                expect(() => nonceState.createFromInvocationCountDiff(new Uint8Array(8), addInvocationCount))
                    .toThrowWithMessageFixed(
                        RangeError,
                        `The value of "addInvocationCount" argument is out of range. It must be >= 1. Received ${addInvocationCount}`,
                    );
            });
        });
    });

    describe('createFromFixedFieldDiff()', () => {
        describe('create from fixed field diff', () => {
            const prevNonce = new Uint8Array([...createFixedField(42), 0x00]);
            it.each(rangeArray(1, 9))('+%i', addFixedField => {
                const nonceState = new Nonce();
                const newNonce = nonceState.createFromFixedFieldDiff(
                    prevNonce,
                    BigInt(addFixedField),
                    BigInt(0),
                );
                expect([...newNonce])
                    .toStrictEqual([...createFixedField(42 + addFixedField), 0x00]);
            });
        });

        describe('reset invocation count', () => {
            const prevNonce = new Uint8Array([...createFixedField(2), 0x08]);
            it.each(rangeArray(1, 9))('+%i', resetInvocationCount => {
                const nonceState = new Nonce();
                const newNonce = nonceState.createFromFixedFieldDiff(
                    prevNonce,
                    BigInt(1),
                    BigInt(resetInvocationCount),
                );
                expect([...newNonce])
                    .toStrictEqual([...createFixedField(2 + 1), resetInvocationCount]);
            });
        });

        describe('increment fixed field by invocation count', () => {
            const prevNonce = new Uint8Array([...createFixedField(), 0x04]);
            const table = [
                {
                    resetInvocationCount: 0xFF + 0,
                    expected: [...createFixedField(0x00 + 1), 0xFF],
                },
                {
                    resetInvocationCount: 0xFF + 1,
                    expected: [...createFixedField(0x01 + 1), 0x00],
                },
                {
                    resetInvocationCount: 0xFF + 2,
                    expected: [...createFixedField(0x01 + 1), 0x01],
                },
                {
                    resetInvocationCount: 0x1FF + 0,
                    expected: [...createFixedField(0x01 + 1), 0xFF],
                },
                {
                    resetInvocationCount: 0x1FF + 1,
                    expected: [...createFixedField(0x02 + 1), 0x00],
                },
                {
                    resetInvocationCount: 0x1FF + 2,
                    expected: [...createFixedField(0x02 + 1), 0x01],
                },
                {
                    resetInvocationCount: 0xFEFF + 0,
                    expected: [...createFixedField(0xFE + 1), 0xFF],
                },
                {
                    resetInvocationCount: 0xFEFF + 1,
                    expected: [...createFixedField(0x00, 0x01), 0x00],
                },
                {
                    resetInvocationCount: 0xFEFF + 2,
                    expected: [...createFixedField(0x00, 0x01), 0x01],
                },
            ];

            it.each<[string, number, number[]]>(table.map(({ resetInvocationCount, expected }) => [
                `0x${resetInvocationCount.toString(16).toUpperCase()}`,
                resetInvocationCount,
                expected,
            ]))('reset to %s', (_, resetInvocationCount, expected) => {
                const nonceState = new Nonce();
                const newNonce = nonceState.createFromFixedFieldDiff(
                    prevNonce,
                    BigInt(1),
                    BigInt(resetInvocationCount),
                );
                expect([...newNonce]).toStrictEqual(expected);
            });
        });

        it('return value is not affected by state', () => {
            const nonceState = new Nonce();
            const currentNonce = nonceState.create(9);
            const prevNonce = new Uint8Array([...createFixedField(0x03), 0x00]);

            expect([...currentNonce.subarray(0, 7)])
                .not.toStrictEqual([...prevNonce.subarray(0, 7)]);

            const newNonce = nonceState.createFromFixedFieldDiff(prevNonce, BigInt(1), BigInt(0));
            expect([...newNonce])
                .toStrictEqual([...createFixedField(0x03 + 1), 0x00]);
        });

        describe('update state', () => {
            it('fixed field value is too large', () => {
                const nonceState = new Nonce();
                // fixed: currentFixedField, invocation: 0
                const currentFixedField = nonceState.create(9).subarray(0, 7);

                nonceState.create(9); // fixed: currentFixedField, invocation: 1
                nonceState.create(9); // fixed: currentFixedField, invocation: 2
                nonceState.create(9); // fixed: currentFixedField, invocation: 3
                // fixed: currentFixedField, invocation: 4
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 4, 0x00]);

                // fixed: currentFixedField -> ([0x00, ..., 0x01] + 1) because currentFixedField < ([0x00, ..., 0x01] + 1)
                // invocation: 4 -> 0 because currentFixedField < ([0x00, ..., 0x01] + 1)
                expect([...nonceState.createFromFixedFieldDiff(
                    Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00]),
                    BigInt(1),
                    BigInt(0),
                )])
                    .toStrictEqual([0x00 + 1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0]);

                // fixed: ([0x00, ..., 0x01] + 1), invocation: 1
                expect([...nonceState.create(9)])
                    .toStrictEqual([0x00 + 1, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 1, 0x00]);
            });
            it('invocation field value is too large', () => {
                const nonceState = new Nonce();

                const prevFixedField = tooLargeFixedField;
                // invocation: 11
                const currentFixedField = nonceState.createFromFixedFieldDiff(
                    Buffer.from([...prevFixedField, 69]),
                    BigInt(1),
                    BigInt(11),
                ).subarray(0, 7);

                nonceState.create(9); // invocation: 12
                nonceState.create(9); // invocation: 13
                // invocation: 14
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 14, 0x00]);

                // invocation: 14 -> 42 because 14 < 42
                expect([...nonceState.createFromFixedFieldDiff(
                    Buffer.from([...prevFixedField, 121]),
                    BigInt(1),
                    BigInt(42),
                )])
                    .toStrictEqual([...currentFixedField, 42]);

                // fixed: currentFixedField, invocation: 43
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 43, 0x00]);
            });
        });

        describe('should not update state', () => {
            it('fixed field value is too small', () => {
                const nonceState = new Nonce();
                const currentFixedField = nonceState.create(9).subarray(0, 7); // invocation: 0
                // fixed: currentFixedField, invocation: 1
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x01, 0x00]);

                // can not update fixed field because not currentFixedField < (tooSmallFixedField + 1)
                nonceState.createFromFixedFieldDiff(
                    Buffer.from([...tooSmallFixedField, 0x00]),
                    BigInt(1),
                    BigInt(0),
                );
                // fixed: currentFixedField, invocation: 2
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x02, 0x00]);

                // can not update fixed field
                nonceState.createFromFixedFieldDiff(
                    Buffer.from([...tooSmallFixedField, 0x00]),
                    BigInt(2),
                    BigInt(0),
                );
                nonceState.createFromFixedFieldDiff(
                    Buffer.from([...tooSmallFixedField, 0x00]),
                    BigInt(3),
                    BigInt(0),
                );
                nonceState.createFromFixedFieldDiff(
                    Buffer.from([...tooSmallFixedField, 0x00]),
                    BigInt(4),
                    BigInt(0),
                );
                // fixed: currentFixedField, invocation: 3
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 0x03, 0x00]);
            });
            it('invocation field value is too small', () => {
                const nonceState = new Nonce();

                const prevFixedField = tooLargeFixedField;
                // invocation: 11
                const currentFixedField = nonceState.createFromFixedFieldDiff(
                    Buffer.from([...prevFixedField, 69]),
                    BigInt(1),
                    BigInt(11),
                ).subarray(0, 7);

                nonceState.create(9); // invocation: 12
                nonceState.create(9); // invocation: 13
                nonceState.create(9); // invocation: 14
                nonceState.create(9); // invocation: 15
                nonceState.create(9); // invocation: 16
                // invocation: 17
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 17, 0x00]);

                // can not update invocation because equals fixed field and not 18 < 12
                nonceState.createFromFixedFieldDiff(
                    Buffer.from([...prevFixedField, 666]),
                    BigInt(1),
                    BigInt(12),
                );
                // invocation: 18
                expect([...nonceState.create(9)])
                    .toStrictEqual([...currentFixedField, 18, 0x00]);
            });
        });

        describe('invalid "prevNonce" argument', () => {
            describe('too short byte length', () => {
                it.each(rangeArray(0, MIN_INPUT_NONCE_LENGTH - 1))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.createFromFixedFieldDiff(new Uint8Array(len), BigInt(1), BigInt(0)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "prevNonce" argument has too short byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });

            describe('valid byte length', () => {
                it.each(rangeArray(MIN_INPUT_NONCE_LENGTH, MAX_NONCE_LENGTH))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.createFromFixedFieldDiff(new Uint8Array(len), BigInt(1), BigInt(0)))
                        .not.toThrow();
                });
            });

            describe('too long byte length', () => {
                it.each(rangeArray(MAX_NONCE_LENGTH + 1, MAX_NONCE_LENGTH + 5))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.createFromFixedFieldDiff(new Uint8Array(len), BigInt(1), BigInt(0)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "prevNonce" argument has too long byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });
        });

        describe('invalid "addFixedField" argument', () => {
            it.each(rangeArray(-5, 0).map(BigInt))('%i', addFixedField => {
                const nonceState = new Nonce();
                expect(() => nonceState.createFromFixedFieldDiff(new Uint8Array(8), addFixedField, BigInt(0)))
                    .toThrowWithMessageFixed(
                        RangeError,
                        `The value of "addFixedField" argument is out of range. It must be >= 1. Received ${addFixedField}`,
                    );
            });
        });

        describe('invalid "resetInvocationCount" argument', () => {
            it.each(rangeArray(-5, -1).map(BigInt))('%i', resetInvocationCount => {
                const nonceState = new Nonce();
                expect(() => nonceState.createFromFixedFieldDiff(new Uint8Array(8), BigInt(1), resetInvocationCount))
                    .toThrowWithMessageFixed(
                        RangeError,
                        `The value of "resetInvocationCount" argument is out of range. It must be >= 0. Received ${resetInvocationCount}`,
                    );
            });
        });
    });

    describe('getDiff()', () => {
        describe('get invocation count diff', () => {
            describe.each<[number[], number[], bigint]>([
                [
                    [...createFixedField(), 0x00],
                    [...createFixedField(), 0x01],
                    BigInt(1),
                ],
                [
                    [...createFixedField(), 0x00],
                    [...createFixedField(), 0x02],
                    BigInt(2),
                ],
                [
                    [...createFixedField(), 0x10],
                    [...createFixedField(), 0x42],
                    BigInt(0x32),
                ],
                [
                    [...createFixedField(), 0x01],
                    [...createFixedField(), 0x00, 0x02],
                    BigInt(0x1FF),
                ],
                [
                    [...createFixedField(), 0x00],
                    [...createFixedField(), 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
                    BigInt('0xFFFFFFFFFFFFFFFF'),
                ],
                [
                    [...createFixedField(), 0x03],
                    [...createFixedField(), 0x00],
                    -BigInt(3),
                ],
                [
                    [...createFixedField(), 0x04],
                    [...createFixedField(), 0x04],
                    BigInt(0),
                ],
            ])('prevNonceData:%p currentNonceData:%p', (prevNonceData, currentNonceData, invocationCount) => {
                it.each([
                    ['Buffer x Buffer', Buffer.from(prevNonceData), Buffer.from(currentNonceData)],
                    ['Buffer x Uint8Array', Buffer.from(prevNonceData), new Uint8Array(currentNonceData)],
                    ['Uint8Array x Buffer', new Uint8Array(prevNonceData), Buffer.from(currentNonceData)],
                    ['Uint8Array x Uint8Array', new Uint8Array(prevNonceData), new Uint8Array(currentNonceData)],
                ])('%s', (_, prevNonce, currentNonce) => {
                    const nonceState = new Nonce();
                    expect(nonceState.getDiff(prevNonce, currentNonce))
                        .toStrictEqual({
                            invocationCount,
                        });
                });
            });
        });

        describe('get fixed field diff', () => {
            describe.each<[number[], number[], bigint]>([
                [
                    [...createFixedField(0x00), 0x00],
                    [...createFixedField(0x01), 0x00],
                    BigInt(1),
                ],
                [
                    [...createFixedField(0x00), 0x09],
                    [...createFixedField(0x02), 0x01],
                    BigInt(2),
                ],
                [
                    [...createFixedField(0x10), 0x00],
                    [...createFixedField(0x42), 0x00],
                    BigInt(0x32),
                ],
                [
                    [...createFixedField(0x01), 0x00],
                    [...createFixedField(0x00, 0x02), 0x00],
                    BigInt(0x1FF),
                ],
                [
                    [...createFixedField(), 0x00],
                    [...createFixedField(0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF), 0x00],
                    BigInt('0xFFFFFFFFFFFFFF'),
                ],
                [
                    [...createFixedField(0x3), 0x00],
                    [...createFixedField(0x00), 0x00],
                    -BigInt(3),
                ],
            ])('prevNonceData:%p currentNonceData:%p', (prevNonceData, currentNonceData, fixedField) => {
                it.each([
                    ['Buffer x Buffer', Buffer.from(prevNonceData), Buffer.from(currentNonceData)],
                    ['Buffer x Uint8Array', Buffer.from(prevNonceData), new Uint8Array(currentNonceData)],
                    ['Uint8Array x Buffer', new Uint8Array(prevNonceData), Buffer.from(currentNonceData)],
                    ['Uint8Array x Uint8Array', new Uint8Array(prevNonceData), new Uint8Array(currentNonceData)],
                ])('%s', (_, prevNonce, currentNonce) => {
                    const nonceState = new Nonce();
                    expect(nonceState.getDiff(prevNonce, currentNonce))
                        .toStrictEqual({
                            fixedField,
                            resetInvocationCount: expect.any(BigInt),
                        });
                });
            });
        });

        describe('get new invocation count from fixed field diff', () => {
            describe.each<[number[], number[], bigint]>([
                [
                    [...createFixedField(0x00), 0x09],
                    [...createFixedField(0x01), 0x00],
                    BigInt(0),
                ],
                [
                    [...createFixedField(0x00), 0x00],
                    [...createFixedField(0x01), 0x09],
                    BigInt(9),
                ],
                [
                    [...createFixedField(0x00), 0x58],
                    [...createFixedField(0x01), 0x32],
                    BigInt(0x32),
                ],
                [
                    [...createFixedField(0x00), 0x01],
                    [...createFixedField(0x01), 0x00, 0x02],
                    BigInt(0x200),
                ],
                [
                    [...createFixedField(0x00), 0x10, 0x20],
                    [...createFixedField(0x01), 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
                    BigInt('0xFFFFFFFFFFFFFFFF'),
                ],
            ])('prevNonceData:%p currentNonceData:%p', (prevNonceData, currentNonceData, resetInvocationCount) => {
                it.each([
                    ['Buffer x Buffer', Buffer.from(prevNonceData), Buffer.from(currentNonceData)],
                    ['Buffer x Uint8Array', Buffer.from(prevNonceData), new Uint8Array(currentNonceData)],
                    ['Uint8Array x Buffer', new Uint8Array(prevNonceData), Buffer.from(currentNonceData)],
                    ['Uint8Array x Uint8Array', new Uint8Array(prevNonceData), new Uint8Array(currentNonceData)],
                ])('%s', (_, prevNonce, currentNonce) => {
                    const nonceState = new Nonce();
                    expect(nonceState.getDiff(prevNonce, currentNonce))
                        .toStrictEqual({
                            fixedField: expect.any(BigInt),
                            resetInvocationCount: resetInvocationCount,
                        });
                });
            });
        });

        describe('invalid "prevNonce" argument', () => {
            describe('too short byte length', () => {
                it.each(rangeArray(0, MIN_INPUT_NONCE_LENGTH - 1))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.getDiff(new Uint8Array(len), new Uint8Array(MIN_INPUT_NONCE_LENGTH)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "prevNonce" argument has too short byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });

            describe('valid byte length', () => {
                it.each(rangeArray(MIN_INPUT_NONCE_LENGTH, MAX_NONCE_LENGTH))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.getDiff(new Uint8Array(len), new Uint8Array(MIN_INPUT_NONCE_LENGTH)))
                        .not.toThrow();
                });
            });

            describe('too long byte length', () => {
                it.each(rangeArray(MAX_NONCE_LENGTH + 1, MAX_NONCE_LENGTH + 5))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.getDiff(new Uint8Array(len), new Uint8Array(MIN_INPUT_NONCE_LENGTH)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "prevNonce" argument has too long byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });
        });

        describe('invalid "currentNonce" argument', () => {
            describe('too short byte length', () => {
                it.each(rangeArray(0, MIN_INPUT_NONCE_LENGTH - 1))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.getDiff(new Uint8Array(MIN_INPUT_NONCE_LENGTH), new Uint8Array(len)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "currentNonce" argument has too short byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });

            describe('valid byte length', () => {
                it.each(rangeArray(MIN_INPUT_NONCE_LENGTH, MAX_NONCE_LENGTH))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.getDiff(new Uint8Array(MIN_INPUT_NONCE_LENGTH), new Uint8Array(len)))
                        .not.toThrow();
                });
            });

            describe('too long byte length', () => {
                it.each(rangeArray(MAX_NONCE_LENGTH + 1, MAX_NONCE_LENGTH + 5))('%i bytes', len => {
                    const nonceState = new Nonce();
                    expect(() => nonceState.getDiff(new Uint8Array(MIN_INPUT_NONCE_LENGTH), new Uint8Array(len)))
                        .toThrowWithMessageFixed(
                            RangeError,
                            `The value of "currentNonce" argument has too long byte length. It must be >= ${MIN_INPUT_NONCE_LENGTH} and <= ${MAX_NONCE_LENGTH}. Received ${len}`,
                        );
                });
            });
        });
    });

    it('increment 64-bit invocation field', () => {
        const nonceState = new Nonce();
        expect(nonceState.createFromInvocationCountDiff(
            Buffer.from([...tooLargeFixedField, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
            BigInt(1),
        )).toStrictEqual(
            Buffer.from([...tooLargeFixedField, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(nonceState.create(tooLargeFixedField.length + 8)).toStrictEqual(
            Buffer.from([...tooLargeFixedField, 0x02, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
    });

    it('increment fixed field if invocation field overflows', () => {
        const nonceState = new Nonce();
        expect([...nonceState.createFromInvocationCountDiff(
            Buffer.from([0x00, ...tooLargeFixedField.slice(1), 0xFE, 0xFF]),
            BigInt(1),
        )]).toStrictEqual([0x00, ...tooLargeFixedField.slice(1), 0xFF, 0xFF]);
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
        expect(nonceState.createFromInvocationCountDiff(
            Buffer.from([0x00, ...tooLargeFixedField.slice(1), 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
            BigInt(1),
        )).toStrictEqual(
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

        expect(nonceState.createFromInvocationCountDiff(
            Buffer.from([...fixedField, 0xFE, 0xFF]),
            BigInt(1),
        )).toStrictEqual(
            Buffer.from([...fixedField, 0xFF, 0xFF]),
        );
        expect(() => nonceState.create(9)).toThrowWithMessageFixed(
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

        expect(nonceState.createFromInvocationCountDiff(
            Buffer.from([...fixedField, 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
            BigInt(1),
        )).toStrictEqual(
            Buffer.from([...fixedField, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]),
        );
        expect(() => nonceState.create(15)).toThrowWithMessageFixed(
            Error,
            `Unable to create nonce. All bits are overflowing.`,
        );
    });
});
