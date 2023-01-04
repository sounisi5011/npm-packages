import { inspect } from 'util';

function isObject(value: unknown): value is object {
    return (typeof value === 'object' || typeof value === 'function') && value !== null;
}

/**
 * Check if a string is a valid ECMAScript 2015-2022 identifier name
 * @see https://262.ecma-international.org/6.0/#sec-property-accessors
 * @see https://262.ecma-international.org/6.0/#sec-names-and-keywords
 * @see https://262.ecma-international.org/7.0/#sec-property-accessors
 * @see https://262.ecma-international.org/7.0/#prod-IdentifierName
 * @see https://262.ecma-international.org/8.0/#sec-property-accessors
 * @see https://262.ecma-international.org/8.0/#prod-IdentifierName
 * @see https://262.ecma-international.org/9.0/#sec-property-accessors
 * @see https://262.ecma-international.org/9.0/#prod-IdentifierName
 * @see https://262.ecma-international.org/9.0/#prod-IdentifierName
 * @see https://262.ecma-international.org/10.0/#sec-property-accessors
 * @see https://262.ecma-international.org/10.0/#prod-IdentifierName
 * @see https://262.ecma-international.org/11.0/#sec-property-accessors
 * @see https://262.ecma-international.org/11.0/#prod-IdentifierName
 * @see https://262.ecma-international.org/12.0/#sec-property-accessors
 * @see https://262.ecma-international.org/12.0/#prod-IdentifierName
 * @see https://tc39.es/ecma262/2022/multipage/ecmascript-language-expressions.html#sec-property-accessors
 * @see https://tc39.es/ecma262/2022/multipage/ecmascript-language-lexical-grammar.html#prod-IdentifierName
 */
function isValidIdentifierName(str: string): boolean {
    return /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u.test(str);
}

function genPropAccessorCode(propName: string | symbol): string {
    return typeof propName === 'string' && isValidIdentifierName(propName)
        ? `.${propName}`
        : `[${String(propName)}]`;
}

export interface SpyObjCallItem {
    readonly type: keyof ProxyHandler<object>;
    readonly path: string;
}

const origObj = new WeakMap<object, object>();
const getOrig = <T>(value: T): T => {
    if (!isObject(value)) return value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (origObj.get(value) as any) ?? value;
};

function internalSpyObj<T>(target: T, parentPath: string, callCallback: (callItem: SpyObjCallItem) => void): T {
    if (!isObject(target)) return target;

    const proxyObj = new Proxy(target, {
        apply(target, thisArg, argArray) {
            const path = `${parentPath}(${argArray.map(arg => inspect(arg, { breakLength: Infinity })).join(', ')})`;
            callCallback({ type: 'apply', path });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return Reflect.apply(getOrig(target) as any, getOrig(thisArg), argArray);
        },
        construct(target, argArray, newTarget) {
            const path = `new ${parentPath || '<self>'}(${
                argArray.map(arg => inspect(arg, { breakLength: Infinity })).join(', ')
            })`;
            callCallback({ type: 'construct', path });
            return internalSpyObj(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Reflect.construct(getOrig(target) as any, argArray, getOrig(newTarget) as any),
                `(${path})`,
                callCallback,
            );
        },
        defineProperty(target, p, attributes) {
            callCallback({ type: 'defineProperty', path: `${parentPath}${genPropAccessorCode(p)}` });
            return Reflect.defineProperty(getOrig(target), p, attributes);
        },
        getOwnPropertyDescriptor(target, p) {
            callCallback({ type: 'getOwnPropertyDescriptor', path: `${parentPath}${genPropAccessorCode(p)}` });
            return Reflect.getOwnPropertyDescriptor(getOrig(target), p);
        },
        deleteProperty(target, p) {
            callCallback({ type: 'deleteProperty', path: `${parentPath}${genPropAccessorCode(p)}` });
            return Reflect.deleteProperty(getOrig(target), p);
        },
        get(target, p) {
            const path = `${parentPath}${genPropAccessorCode(p)}`;
            callCallback({ type: 'get', path });
            return internalSpyObj(
                Reflect.get(getOrig(target), p),
                path,
                callCallback,
            );
        },
        has(target, p) {
            callCallback({ type: 'has', path: `${parentPath}${genPropAccessorCode(p)}` });
            return Reflect.has(getOrig(target), p);
        },
        set(target, p, value) {
            callCallback({ type: 'set', path: `${parentPath}${genPropAccessorCode(p)}` });
            return Reflect.set(getOrig(target), p, value);
        },
        getPrototypeOf(target) {
            callCallback({ type: 'getPrototypeOf', path: `Object.getPrototypeOf(${parentPath || '<self>'})` });
            // Note: If the return value of `getPrototypeOf()` is wrapped in a Proxy object,
            //       the `instanceof` operator will not work.
            return Reflect.getPrototypeOf(getOrig(target));
        },
        setPrototypeOf(target, v) {
            callCallback({ type: 'setPrototypeOf', path: parentPath });
            return Reflect.setPrototypeOf(getOrig(target), v);
        },
        ownKeys(target) {
            callCallback({ type: 'ownKeys', path: parentPath });
            return internalSpyObj(
                Reflect.ownKeys(getOrig(target)),
                parentPath,
                callCallback,
            );
        },
        isExtensible(target) {
            callCallback({ type: 'isExtensible', path: parentPath });
            return Reflect.isExtensible(getOrig(target));
        },
        preventExtensions(target) {
            callCallback({ type: 'preventExtensions', path: parentPath });
            return Reflect.preventExtensions(getOrig(target));
        },
    });
    origObj.set(proxyObj, target);

    return proxyObj;
}

export function spyObj<T extends object>(target: T, ignorePathList: ReadonlyArray<string | RegExp> = []): {
    value: T;
    calls: readonly SpyObjCallItem[];
    newCalls: readonly SpyObjCallItem[];
} {
    const calls: SpyObjCallItem[] = [];
    const value = internalSpyObj(target, '', item => {
        if (
            ignorePathList.some(ignorePath => {
                if (ignorePath instanceof RegExp) {
                    return ignorePath.test(item.path);
                }
                return item.path === ignorePath;
            })
        ) {
            return;
        }
        calls.push(item);
    });

    let readedIndex = 0;
    return {
        value,
        calls,
        get newCalls() {
            const ret = calls.slice(readedIndex);
            readedIndex += calls.length;
            return ret;
        },
    };
}
