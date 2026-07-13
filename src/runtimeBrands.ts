/* eslint-disable @typescript-eslint/unbound-method -- brand checks deliberately invoke captured built-in intrinsics with explicit receivers. */
const functionToString = Function.prototype.toString;
const nativeObjectSource = Reflect.apply(functionToString, Object, []);
const immutableDateTimestamps = new WeakMap<object, number>();

export interface DateInspection {
  readonly isDate: boolean;
  readonly timestamp: number;
}

export function registerImmutableDate(value: object, timestamp: number): void {
  immutableDateTimestamps.set(value, timestamp);
}

export function inspectDate(value: unknown): DateInspection {
  if (
    (typeof value !== 'object' || value === null) &&
    typeof value !== 'function'
  ) {
    return { isDate: false, timestamp: Number.NaN };
  }

  const registeredTimestamp = immutableDateTimestamps.get(value);
  if (registeredTimestamp !== undefined) {
    return { isDate: true, timestamp: registeredTimestamp };
  }

  try {
    const timestamp = Reflect.apply(Date.prototype.getTime, value, []);
    return { isDate: true, timestamp };
  } catch {
    return { isDate: false, timestamp: Number.NaN };
  }
}

export function isPlainRecord(
  value: unknown,
): value is Record<PropertyKey, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  try {
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype === null || prototype === Object.prototype) {
      return true;
    }
    if (Reflect.getPrototypeOf(prototype) !== null) {
      return false;
    }

    const constructorDescriptor = Object.getOwnPropertyDescriptor(
      prototype,
      'constructor',
    );
    if (
      !constructorDescriptor ||
      !('value' in constructorDescriptor) ||
      typeof constructorDescriptor.value !== 'function'
    ) {
      return false;
    }

    return (
      Reflect.apply(functionToString, constructorDescriptor.value, []) ===
      nativeObjectSource
    );
  } catch {
    return false;
  }
}
