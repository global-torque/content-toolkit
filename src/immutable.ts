import type { DeepReadonly } from './types.js';
import {
  inspectDate,
  isPlainRecord,
  registerImmutableDate,
} from './runtimeBrands.js';

const DATE_MUTATION_METHODS = new Set<PropertyKey>([
  'setDate',
  'setFullYear',
  'setHours',
  'setMilliseconds',
  'setMinutes',
  'setMonth',
  'setSeconds',
  'setTime',
  'setUTCDate',
  'setUTCFullYear',
  'setUTCHours',
  'setUTCMilliseconds',
  'setUTCMinutes',
  'setUTCMonth',
  'setUTCSeconds',
  'setYear',
]);

function createImmutableDate(timestamp: number): Date {
  const target = new Date(timestamp);
  const immutableDate = new Proxy(target, {
    get(date, property) {
      if (DATE_MUTATION_METHODS.has(property)) {
        return () => {
          throw new TypeError('Content snapshot dates are immutable.');
        };
      }

      const member = Reflect.get(date, property, date) as unknown;
      if (typeof member === 'function') {
        return (...args: unknown[]): unknown =>
          Reflect.apply(member, date, args) as unknown;
      }
      return member;
    },
    set() {
      return false;
    },
  });
  registerImmutableDate(immutableDate, timestamp);
  return Object.freeze(immutableDate);
}

function isPrimitive(
  value: unknown,
): value is null | undefined | string | number | boolean | bigint | symbol {
  return (
    value === null || (typeof value !== 'object' && typeof value !== 'function')
  );
}

function defineClonedValue(
  target: object,
  key: PropertyKey,
  value: unknown,
): void {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function cloneValue(
  value: unknown,
  seen: WeakMap<object, object>,
  rootOverrides?: ReadonlyMap<string | symbol, unknown>,
): unknown {
  if (isPrimitive(value)) {
    return value;
  }

  if (typeof value === 'function') {
    throw new TypeError('Content metadata must not contain functions.');
  }

  const existing = seen.get(value);
  if (existing) {
    return existing;
  }

  const date = inspectDate(value);
  if (date.isDate) {
    const clonedDate = createImmutableDate(date.timestamp);
    seen.set(value, clonedDate);
    return Object.freeze(clonedDate);
  }

  if (Array.isArray(value)) {
    const clonedArray: unknown[] = new Array(value.length);
    seen.set(value, clonedArray);
    Reflect.ownKeys(value).forEach((key) => {
      if (key === 'length') {
        return;
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable) {
        return;
      }
      if (!('value' in descriptor)) {
        throw new TypeError(
          'Content metadata must not contain accessor properties.',
        );
      }
      defineClonedValue(clonedArray, key, cloneValue(descriptor.value, seen));
    });
    return Object.freeze(clonedArray);
  }

  if (!isPlainRecord(value)) {
    throw new TypeError(
      'Content metadata must contain only primitives, dates, arrays, and plain objects.',
    );
  }

  const clonedObject = (
    Reflect.getPrototypeOf(value) === null
      ? (Object.create(null) as unknown)
      : {}
  ) as Record<PropertyKey, unknown>;
  seen.set(value, clonedObject);

  const sourceKeys = Reflect.ownKeys(value);
  const definedKeys = new Set<PropertyKey>();
  sourceKeys.forEach((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable) {
      return;
    }
    if (!('value' in descriptor)) {
      throw new TypeError(
        'Content metadata must not contain accessor properties.',
      );
    }
    const sourceValue: unknown = rootOverrides?.has(key)
      ? rootOverrides.get(key)
      : (descriptor.value as unknown);
    defineClonedValue(clonedObject, key, cloneValue(sourceValue, seen));
    definedKeys.add(key);
  });

  rootOverrides?.forEach((overrideValue, key) => {
    if (!definedKeys.has(key)) {
      defineClonedValue(clonedObject, key, cloneValue(overrideValue, seen));
    }
  });

  return Object.freeze(clonedObject);
}

/** Create a detached, recursively frozen snapshot of structured content metadata. */
export function createContentSnapshot<T>(value: T): DeepReadonly<T> {
  return cloneValue(value, new WeakMap<object, object>()) as DeepReadonly<T>;
}

/** Clone a root record once while replacing selected own fields. */
export function createContentSnapshotWithOverrides<T extends object>(
  value: T,
  overrides: ReadonlyMap<string | symbol, unknown>,
): DeepReadonly<T> {
  return cloneValue(
    value,
    new WeakMap<object, object>(),
    overrides,
  ) as DeepReadonly<T>;
}
