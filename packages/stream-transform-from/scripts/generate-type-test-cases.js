// @ts-check

const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');

// eslint-disable-next-line import/no-extraneous-dependencies
const combinate = require('combinate').default;
// eslint-disable-next-line import/no-extraneous-dependencies
const _wordJoin = require('word-join');

// word-join exports the `wordJoin` function using `module.exports`.
// So there is no `default` property.
// But TypeScript does not allow to use `wordJoin` function without using `default` property.
// So we get around this problem by using a meaningless conditional expression.
const wordJoin = typeof _wordJoin === 'function'
  ? _wordJoin
  : _wordJoin.default;

/**
 * @typedef {symbol} ValueType
 */
const undefinedType = Symbol('type:undefined');
const falseType = Symbol('type:false');
const trueType = Symbol('type:true');
const booleanType = Symbol('type:boolean');
/**
 * Follow this order when sorting the test code based on the option values
 * @type {(ValueType | undefined)[]}
 */
const valueTypeSortOrder = [undefined, undefinedType, falseType, trueType, booleanType];
/**
 * @typedef {{
 *   typeCode: string;
 *   getPropValueType: (propName: string) => ValueType | undefined;
 *   isIndexSignature?: boolean
 * }} DefaultOptionsData
 * @type {Record<string, DefaultOptionsData>}
 */
const defaultOptionsList = {
  transformOpts: {
    typeCode: 'stream.TransformOptions',
    getPropValueType: () => booleanType,
  },
  falseIndexSignature: {
    typeCode: 'Record<string, false>',
    getPropValueType: () => falseType,
    isIndexSignature: true,
  },
  trueIndexSignature: {
    typeCode: 'Record<string, true>',
    getPropValueType: () => trueType,
    isIndexSignature: true,
  },
  boolIndexSignature: {
    typeCode: 'Record<string, boolean>',
    getPropValueType: () => booleanType,
    isIndexSignature: true,
  },
};

/**
 * Checks if `receivedType` is included in `expectedTypeList`
 *
 * Did you think you could just use the `Array.prototype.includes()` method?
 * We think so too. But TypeScript's type declarations do not allow it.
 * @see https://github.com/microsoft/TypeScript/issues/26255
 *
 * @param {(ValueType | undefined)[]} expectedTypeList
 * @param {ValueType | undefined} receivedType
 * @returns {boolean}
 */
function checkType(expectedTypeList, receivedType) {
  return expectedTypeList.includes(receivedType);
}

/**
 * Convert `ValueType` to JavaScript expression string
 *
 * It __does not__ convert to a TypeScript type.
 * For example, a `boolean` type will be converted to the variable `bool`.
 * This cannot be used in type declarations without using the `typeof` operator.
 *
 * @param {ValueType} type
 * @returns {string}
 */
function type2valueCode(type) {
  if (type === undefinedType) return 'undefined';
  if (type === falseType) return 'false';
  if (type === trueType) return 'true';
  if (type === booleanType) return 'bool';
  throw new RangeError('Unknown type symbol received');
}

/**
 * Convert an object with a `ValueType` as its value to a JavaScript expression string
 * Properties with `undefined` as value instead of `ValueType` are omitted.
 *
 * @param {Record<string, ValueType | undefined>} objType
 * @param {object} [defaultValue]
 * @param {string | undefined} defaultValue.exprCode
 * @param {boolean} [defaultValue.isIndexSignature]
 * @returns {string}
 */
function objectType2valueCode(objType, defaultValue) {
  const propCodeList = Object.entries(objType).flatMap(([propName, valueType]) =>
    valueType !== undefined
      ? [`${propName}: ${type2valueCode(valueType)}`]
      : []
  );
  if (defaultValue && defaultValue.exprCode) {
    return propCodeList.length >= 1
      ? (
        defaultValue.isIndexSignature
          // Currently, TypeScript drops index signatures when using spread syntax.
          // This bug can be worked around by using the `Object.assign` function.
          // see https://github.com/microsoft/TypeScript/issues/27273
          ? `Object.assign(${defaultValue.exprCode}, { ${propCodeList.join(', ')} } as const)`
          : `{ ${[`...${defaultValue.exprCode}`, ...propCodeList].join(', ')} }`
      )
      : defaultValue.exprCode;
  }
  return propCodeList.length >= 1
    ? `{ ${propCodeList.join(', ')} }`
    : '{}';
}

/**
 * @param {typeof valueTypeSortOrder[number]} valueType
 * @returns {number}
 */
const getValueTypeSortPriority = valueType => {
  const index = valueTypeSortOrder.indexOf(valueType);
  return index < 0 ? Infinity : index;
};

/**
 * @param {Partial<Record<keyof import('stream').TransformOptions, typeof valueTypeSortOrder[number]>>} a
 * @param {Partial<Record<keyof import('stream').TransformOptions, typeof valueTypeSortOrder[number]>>} b
 * @returns {number}
 */
function transformOptionsSortCompareFn(a, b) {
  const aPropsLength = Object.entries(a)
    .filter(([, optionValueType]) => optionValueType !== undefined)
    .length;
  const bPropsLength = Object.entries(b)
    .filter(([, optionValueType]) => optionValueType !== undefined)
    .length;
  // Options with fewer properties are listed first
  if (aPropsLength !== bPropsLength) return aPropsLength - bPropsLength;

  const isDiffReadableObjectMode = a.readableObjectMode !== b.readableObjectMode;
  const isDiffWritableObjectMode = a.writableObjectMode !== b.writableObjectMode;
  if (a.objectMode !== b.objectMode) {
    if (
      a.objectMode === undefined && (
        (isDiffReadableObjectMode && b.readableObjectMode === undefined)
        || (isDiffWritableObjectMode && b.writableObjectMode === undefined)
      )
    ) {
      // b < a
      return 1;
    }
    if (
      b.objectMode === undefined && (
        (isDiffReadableObjectMode && a.readableObjectMode === undefined)
        || (isDiffWritableObjectMode && a.writableObjectMode === undefined)
      )
    ) {
      // a < b
      return -1;
    }
    return getValueTypeSortPriority(a.objectMode) - getValueTypeSortPriority(b.objectMode);
  }
  if (isDiffReadableObjectMode) {
    if (
      a.readableObjectMode === undefined && (
        isDiffWritableObjectMode && b.writableObjectMode === undefined
      )
    ) {
      // b < a
      return 1;
    }
    if (
      b.readableObjectMode === undefined && (
        isDiffWritableObjectMode && a.writableObjectMode === undefined
      )
    ) {
      // a < b
      return -1;
    }
    return getValueTypeSortPriority(a.readableObjectMode) - getValueTypeSortPriority(b.readableObjectMode);
  }
  if (isDiffWritableObjectMode) {
    return getValueTypeSortPriority(a.writableObjectMode) - getValueTypeSortPriority(b.writableObjectMode);
  }
  return 0;
}

/**
 * @template T
 * @template U
 * @param {number | unknown[]} count
 * @param {T} singular
 * @param {U} plural
 * @returns {T | U}
 */
function singularOrPlural(count, singular, plural) {
  const countNum = Array.isArray(count) ? count.length : count;
  return countNum > 1 ? plural : singular;
}

/**
 * @param {string[]} optionNameList
 * @returns {string}
 */
function joinOptionName(optionNameList) {
  return wordJoin(
    optionNameList.map(optionName => `\`${optionName}\``),
    { oxford: true },
  );
}

const transformOptionsCombinations = combinate({
  objectMode: [undefined, undefinedType, falseType, trueType, booleanType],
  readableObjectMode: [undefined, undefinedType, falseType, trueType, booleanType],
  writableObjectMode: [undefined, undefinedType, falseType, trueType, booleanType],
}).sort(transformOptionsSortCompareFn);

async function genSourceTypeTest() {
  const targetFilepath = path.join(__dirname, '../test-d/source-type.test-d.ts');
  /** @type {() => Iterable<string>} */
  const testFileBodyGeneratorFn = function*() {
    yield [
      `// This file was autogenerated by ${path.relative(path.dirname(targetFilepath), __filename)}`,
      // see https://dprint.dev/plugins/typescript/
      '// dprint-ignore-file',
      '',
      `import type * as stream from 'stream';`,
      '',
      `import { expectType } from 'tsd';`,
      '',
      `import { transformFrom } from '..';`,
      '',
      `declare const ${type2valueCode(booleanType)}: boolean;`,
      ...Object.entries(defaultOptionsList)
        .map(([defaultOptionsName, { typeCode: defaultOptionsType }]) =>
          `declare const ${defaultOptionsName}: ${defaultOptionsType};`
        ),
      '',
      '/* eslint-disable require-yield */',
    ].join('\n');

    for (const transformOptions of transformOptionsCombinations) {
      /** @type {(keyof typeof transformOptions)[]} */
      const checkTargetOptions = ['objectMode', 'writableObjectMode'];

      /** @type {[undefined, Omit<DefaultOptionsData, 'typeCode'>]} */
      const dontUseDefaultValueEntry = [undefined, { getPropValueType: () => undefined }];
      for (
        const [defaultOptionsName, { getPropValueType, isIndexSignature }] of [
          dontUseDefaultValueEntry,
          ...Object.entries(defaultOptionsList),
        ]
      ) {
        /**
         * If the `objectMode` and `writableObjectMode` options are not `true`,
         * the chunk value is always an instance of Buffer.
         */
        const probablyTrueOptions = checkTargetOptions.flatMap(optionName =>
          checkType([trueType, booleanType], transformOptions[optionName] || getPropValueType(optionName))
            ? [optionName]
            : []
        );
        const chunkTypeIsBuffer = probablyTrueOptions.length === 0;

        const chunkTypeCode = chunkTypeIsBuffer ? 'Buffer' : 'unknown';
        const reasonMessage = `chunk type is \`${chunkTypeCode}\`. because the ${
          probablyTrueOptions.length >= 1
            ? `${joinOptionName(probablyTrueOptions)} ${
              singularOrPlural(probablyTrueOptions, 'option is', 'options are')
            } probably \`true\``
            : `${joinOptionName(checkTargetOptions)} ${
              singularOrPlural(checkTargetOptions, 'option is', 'options are')
            } not \`true\``
        }`;
        yield [
          '',
          '',
          // Use tab characters for indentation to reduce test file size
          `transformFrom(async function*(source) {`,
          `\tfor await (const { chunk } of source) {`,
          `\t\t// ${reasonMessage}`,
          `\t\texpectType<${chunkTypeCode}>(chunk);`,
          `\t}`,
          `}, ${
            objectType2valueCode(
              transformOptions,
              { exprCode: defaultOptionsName, isIndexSignature },
            )
          });`,
        ].join('\n');
      }
    }
    yield '\n\n/* eslint-enable */';
  };

  await promisify(stream.pipeline)(
    stream.Readable.from(testFileBodyGeneratorFn()),
    fs.createWriteStream(targetFilepath),
  );
  console.log(`Generated ${targetFilepath}`);
}

async function main() {
  await Promise.all([
    genSourceTypeTest(),
  ]);
}

main().catch(error => {
  if (process.exitCode === 0) process.exitCode = 1;
  console.error(error);
});
