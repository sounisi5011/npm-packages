import isPlainObject from 'is-plain-obj';

import { isNotSupported } from '../../src/is-supported';

const anyValues: Array<undefined | null | boolean | number | string | Record<PropertyKey, unknown> | unknown[]> = [
    undefined,
    null,
    true,
    false,
    0,
    1,
    '',
    'foo',
    {},
    [],
];

describe('isNotSupported()', () => {
    it('empty pkg', () => {
        expect(isNotSupported({}, '1.0.0')).toStrictEqual(false);
    });
    describe('node version', () => {
        describe.each<string>([
            '8.2.9',
        ])('nodeVersion: %s', (nodeVersion: string) => {
            it.each<[Record<string, unknown>, ReturnType<typeof isNotSupported>]>([
                [{ engines: {} }, false],
                [{ engines: { node: '' } }, false],
                [{ engines: { node: '*' } }, false],
                [{ engines: { node: '8.x' } }, false],
                [{ engines: { node: '8 || 12 || 14 || 16' } }, false],
                [
                    { engines: { node: '12.x' } },
                    `Node ${nodeVersion} is not included in supported range: 12.x`,
                ],
                [
                    { engines: { node: '^12.17' } },
                    `Node ${nodeVersion} is not included in supported range: ^12.17`,
                ],
                [
                    { engines: { node: '12 || 14 || 16' } },
                    `Node ${nodeVersion} is not included in supported range: 12 || 14 || 16`,
                ],
            ])('%j', (pkg, expected) => {
                expect(isNotSupported(pkg, nodeVersion)).toStrictEqual(expected);
            });
        });
        describe('invalid value', () => {
            it.each<{ engines: unknown }>([
                ...anyValues
                    .filter(v => !isPlainObject(v))
                    .map(v => ({ engines: v })),
                ...anyValues
                    .filter(v => typeof v !== 'string')
                    .map(v => ({ engines: { node: v } })),
            ])('%o', value => {
                expect(() => isNotSupported(value, '1.0.0')).toThrow();
            });
        });
    });
    describe('platform', () => {
        const curOS = process.platform;
        const curCPU = process.arch;
        describe(`os: ${curOS}, cpu: ${curCPU}`, () => {
            type TableItem = [Record<string, unknown>, ReturnType<typeof isNotSupported>];
            it.each<TableItem>([
                /**
                 * os
                 */
                [{ os: '' }, false],
                ...[curOS, 'any'].flatMap<TableItem>(reqOS => [
                    [{ os: reqOS }, false],
                    [{ os: [reqOS] }, false],
                ]),
                [{ os: [] }, false],
                [{ os: [curOS, 'b-tron'] }, false],
                [{ os: ['TRON', curOS, 'b-tron'] }, false],
                ...['b-tron', 'TRON', `!${curOS}`].flatMap<TableItem>(reqOS => {
                    const result = [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        `      - ${reqOS}`,
                    ].join('\n');
                    return [
                        [{ os: reqOS }, result],
                        [{ os: [reqOS] }, result],
                    ];
                }),
                [
                    { os: ['b-tron', 'TRON'] },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        '      - b-tron',
                        '      - TRON',
                    ].join('\n'),
                ],
                [
                    { os: ['TRON', 'b-tron'] },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        '      - TRON',
                        '      - b-tron',
                    ].join('\n'),
                ],
                [
                    { os: ['b-tron', `!${curOS}`, 'TRON'] },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        '      - b-tron',
                        `      - !${curOS}`,
                        '      - TRON',
                    ].join('\n'),
                ],
                /**
                 * cpu
                 */
                [{ cpu: '' }, false],
                ...[curCPU, 'any'].flatMap<TableItem>(reqCPU => [
                    [{ cpu: reqCPU }, false],
                    [{ cpu: [reqCPU] }, false],
                ]),
                [{ cpu: [] }, false],
                [{ cpu: [curCPU, 'z80'] }, false],
                [{ cpu: ['i8080', curCPU, 'z80'] }, false],
                ...['z80', 'i8080', `!${curCPU}`].flatMap<TableItem>(reqCPU => {
                    const result = [
                        'Current platform is not included in supported list:',
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        `      - ${reqCPU}`,
                    ].join('\n');
                    return [
                        [{ cpu: reqCPU }, result],
                        [{ cpu: [reqCPU] }, result],
                    ];
                }),
                [
                    { cpu: ['z80', 'i8080'] },
                    [
                        'Current platform is not included in supported list:',
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        '      - z80',
                        '      - i8080',
                    ].join('\n'),
                ],
                [
                    { cpu: ['i8080', 'z80'] },
                    [
                        'Current platform is not included in supported list:',
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        '      - i8080',
                        '      - z80',
                    ].join('\n'),
                ],
                [
                    { cpu: ['z80', `!${curCPU}`, 'i8080'] },
                    [
                        'Current platform is not included in supported list:',
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        '      - z80',
                        `      - !${curCPU}`,
                        '      - i8080',
                    ].join('\n'),
                ],
                /**
                 * os & cpu
                 */
                [{ os: '', cpu: '' }, false],
                [{ os: [], cpu: '' }, false],
                [{ os: '', cpu: [] }, false],
                [{ os: [], cpu: [] }, false],
                ...[curOS, 'any'].flatMap(reqOS =>
                    [curCPU, 'any'].flatMap<TableItem>(reqCPU => [
                        [{ os: reqOS, cpu: reqCPU }, false],
                        [{ os: [reqOS], cpu: reqCPU }, false],
                        [{ os: reqOS, cpu: [reqCPU] }, false],
                        [{ os: [reqOS], cpu: [reqCPU] }, false],
                    ])
                ),
                [
                    {
                        os: [curOS, 'b-tron'],
                        cpu: [curCPU, 'z80'],
                    },
                    false,
                ],
                [
                    {
                        os: ['TRON', curOS, 'b-tron'],
                        cpu: ['i8080', curCPU, 'z80'],
                    },
                    false,
                ],
                [
                    { os: 'b-tron', cpu: 'z80' },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        '      - b-tron',
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        '      - z80',
                    ].join('\n'),
                ],
                [
                    { os: `!${curOS}`, cpu: `!${curCPU}` },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        `      - !${curOS}`,
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        `      - !${curCPU}`,
                    ].join('\n'),
                ],
                [
                    { os: curOS, cpu: 'z80' },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        `      - ${curOS}`,
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        '      - z80',
                    ].join('\n'),
                ],
                [
                    { os: curOS, cpu: `!${curCPU}` },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        `      - ${curOS}`,
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        `      - !${curCPU}`,
                    ].join('\n'),
                ],
                [
                    { os: 'b-tron', cpu: curCPU },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        '      - b-tron',
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        `      - ${curCPU}`,
                    ].join('\n'),
                ],
                [
                    { os: `!${curOS}`, cpu: curCPU },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        `      - !${curOS}`,
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        `      - ${curCPU}`,
                    ].join('\n'),
                ],
                [
                    {
                        os: ['TRON', 'b-tron'],
                        cpu: ['i8080', 'z80'],
                    },
                    [
                        'Current platform is not included in supported list:',
                        '  os:',
                        `    current: ${curOS}`,
                        '    required:',
                        '      - TRON',
                        '      - b-tron',
                        '  cpu:',
                        `    current: ${curCPU}`,
                        '    required:',
                        '      - i8080',
                        '      - z80',
                    ].join('\n'),
                ],
            ])('%j', (pkg, expected) => {
                expect(isNotSupported(pkg, '1.0.0')).toStrictEqual(expected);
            });
        });
        describe('invalid value', () => {
            const testOsValues: Array<{ os: unknown }> = [
                ...anyValues
                    .filter(v => typeof v !== 'string' && !Array.isArray(v))
                    .flatMap(v => ({ os: v })),
                ...anyValues
                    .filter(v => typeof v !== 'string')
                    .map(v => ({ os: [v] })),
            ];
            const testCpuValues: Array<{ cpu: unknown }> = [
                ...anyValues
                    .filter(v => typeof v !== 'string' && !Array.isArray(v))
                    .flatMap(v => ({ cpu: v })),
                ...anyValues
                    .filter(v => typeof v !== 'string')
                    .map(v => ({ cpu: [v] })),
            ];

            it.each<{ os: unknown } | { cpu: unknown }>([
                ...testOsValues,
                ...testCpuValues,
                ...testOsValues
                    .flatMap(osValue =>
                        testCpuValues
                            .map(cpuValue => ({
                                ...osValue,
                                ...cpuValue,
                            }))
                    ),
            ])('%o', value => {
                expect(() => isNotSupported(value, '1.0.0')).toThrow();
            });
        });
    });
});
