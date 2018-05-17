/* istanbul ignore next */
/** @internal */
export function objectMapValues<T, TResult>(
  collection: { [index: string]: T; },
  callback: (value: T, key: string, collection: { [index: string]: T; }) => TResult
): { [index: string]: TResult; } {
  const result: { [index: string]: TResult; } = {};
  for (const key in collection) {
    if (collection.hasOwnProperty(key)) {
      const value = collection[key];
      result[key] = callback(value, key, collection);
    }
  }
  return result;
};

/* istanbul ignore next */
/** @internal */
export function objectForEach<T extends object>(
  collection: T,
  iteratee: (value: T[keyof T], key: string, collection: T) => any
): T {
  for (const key in collection) {
    if (collection.hasOwnProperty(key)) {
      const value = collection[key];
      iteratee(value, key, collection);
    }
  }
  return collection;
}

// The following code copied from lodash@4.17.10

const objectProto = Object.prototype;
const hasOwnProperty = objectProto.hasOwnProperty;
const nativeObjectToString = objectProto.toString;
const symToStringTag = Symbol ? Symbol.toStringTag : undefined;
const nullTag = '[object Null]';
const undefinedTag = '[object Undefined]';
const numberTag = '[object Number]';
const stringTag = '[object String]';

/* istanbul ignore next */
function getRawTag(value?: any) {
  if (!symToStringTag) return;
  let unmasked: boolean = false
  const isOwn = hasOwnProperty.call(value, symToStringTag);
  const tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    unmasked = true;
  } catch (e) { }

  const result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

/* istanbul ignore next */
function baseGetTag(value?: any) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : nativeObjectToString.call(value);
}

/** @internal */
export const isArray = Array.isArray;

/* istanbul ignore next */
/** @internal */
export function isObjectLike(value?: any): boolean {
  return value != null && typeof value == 'object';
}

/* istanbul ignore next */
/** @internal */
export function isNumber(value?: any): value is number {
  return typeof value == 'number' ||
    (isObjectLike(value) && baseGetTag(value) == numberTag);
}

/* istanbul ignore next */
/** @internal */
export function isString(value?: any): value is string {
  return typeof value == 'string' ||
    (!isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag);
}