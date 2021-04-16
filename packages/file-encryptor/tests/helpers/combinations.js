const { inspect } = require('util');

const combinate = require('combinate').default;

/**
 * @template T
 * @param {{ [P in keyof T]-?: T[P][] }} combinations
 * @param {{ [P in keyof T]?: { record: Record<string, T[P]>, names: readonly string[] } }} enumMap
 * @returns {[string, T][]}
 */
exports.optGen = (combinations, enumMap = {}) =>
  combinate(combinations)
    .map(options => {
      const filteredOptions = Object.entries(options)
        .filter(([, value]) => value !== undefined)
        .reduce((obj, [prop, value]) => ({ ...obj, [prop]: value }), {});
      const label = Object.entries(filteredOptions)
        .map(([prop, value]) => {
          const val = (enumMap[prop] && enumMap[prop].names.find(name => enumMap[prop].record[name] === value))
            || inspect(value, { breakLength: Infinity });
          return `${prop}=${val}`;
        })
        .join(' ');
      return [label, filteredOptions];
    });
