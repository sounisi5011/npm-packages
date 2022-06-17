import { ParsedArgs, parseOptions } from '../../src/options.mjs';

function m<K extends string, V>(obj: Record<K, V>): Map<K, V> {
    return new Map(Object.entries(obj) as Array<[K, V]>);
}

describe('parseOptions()', () => {
    it.each<[string, string[] | undefined, Partial<ParsedArgs>]>([
        [
            '--foo',
            undefined,
            { options: m({ '--foo': [] }) },
        ],
        [
            '-b',
            undefined,
            { options: m({ '-b': [] }) },
        ],
        [
            '-bar',
            undefined,
            { options: m({ '-b': [], '-a': [], '-r': [] }) },
        ],
        [
            '-ba -r',
            undefined,
            { options: m({ '-b': [], '-a': [], '-r': [] }) },
        ],
        [
            '--hoge -----fuga',
            undefined,
            { options: m({ '--hoge': [], '--fuga': [] }) },
        ],
        [
            '-v i-am-not-value',
            undefined,
            { options: m({ '-v': [] }), command: 'i-am-not-value' },
        ],
        [
            '--no-val i-am-not-value',
            undefined,
            { options: m({ '--no-val': [] }), command: 'i-am-not-value' },
        ],
        [
            '-v i-am-value',
            ['-v'],
            { options: m({ '-v': ['i-am-value'] }) },
        ],
        [
            '--has-val i-am-value',
            ['--has-val'],
            { options: m({ '--has-val': ['i-am-value'] }) },
        ],
        [
            '-value i-am-value',
            ['-v', '-a', '-l', '-u', '-e'],
            { options: m({ '-v': [], '-a': [], '-l': [], '-u': [], '-e': ['i-am-value'] }) },
        ],
        [
            '-value i-am-not-value',
            ['-v', '-a', '-l', '-u'],
            { options: m({ '-v': [], '-a': [], '-l': [], '-u': [], '-e': [] }), command: 'i-am-not-value' },
        ],
        [
            '--baz=val',
            undefined,
            { options: m({ '--baz': ['val'] }) },
        ],
        [
            '--qux=val1 --quux=value --qux=val2',
            undefined,
            { options: m({ '--qux': ['val1', 'val2'], '--quux': ['value'] }) },
        ],
        [
            '--empty=',
            undefined,
            { options: m({ '--empty': [''] }) },
        ],
        [
            '--has-equals-sign=e=mc',
            undefined,
            { options: m({ '--has-equals-sign': ['e=mc'] }) },
        ],
        [
            'cmd',
            undefined,
            { command: 'cmd', commandArgs: [] },
        ],
        [
            'cmd arg1 arg2',
            undefined,
            { command: 'cmd', commandArgs: ['arg1', 'arg2'] },
        ],
        [
            'cmd --arg -arg',
            undefined,
            { command: 'cmd', commandArgs: ['--arg', '-arg'] },
        ],
        [
            'cmd --arg --arg',
            undefined,
            { command: 'cmd', commandArgs: ['--arg', '--arg'] },
        ],
        [
            'cmd --foo -- subcmd --bar',
            undefined,
            { command: 'cmd', commandArgs: ['--foo', '--', 'subcmd', '--bar'] },
        ],
        [
            'cmd --foo -- --hoge --fuga',
            undefined,
            { command: 'cmd', commandArgs: ['--foo', '--', '--hoge', '--fuga'] },
        ],
        [
            '-opt --option cmd --cmdarg -arg param 42 -- hoge --fuga=zzz',
            undefined,
            {
                options: m({ '-o': [], '-p': [], '-t': [], '--option': [] }),
                command: 'cmd',
                commandArgs: ['--cmdarg', '-arg', 'param', '42', '--', 'hoge', '--fuga=zzz'],
            },
        ],
    ])('%s', (argsStr, hasValueOptions, expected) => {
        const argv = argsStr.split(' ');
        const parsed: ParsedArgs = { options: new Map(), command: undefined, commandArgs: [], ...expected };
        expect(parseOptions(argv, hasValueOptions)).toStrictEqual(parsed);
    });

    describe('invalid option', () => {
        it.each<string>([
            '-',
            '--',
            '---',
            '----',
            '-----',
        ])('%s', argStr => {
            expect(() => parseOptions([argStr])).toThrow(new Error(`Invalid option \`${String(argStr)}\``));
        });
    });
});
