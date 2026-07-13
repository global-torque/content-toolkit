export function readOwnDataProperty(object: object, key: PropertyKey): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (descriptor === undefined) {
    return undefined;
  }
  if (!('value' in descriptor)) {
    throw new TypeError(
      'Content metadata must not contain accessor properties.',
    );
  }
  return descriptor.value;
}

export function readOptionalStringProperty(
  object: object,
  key: PropertyKey,
): string | undefined {
  const value = readOwnDataProperty(object, key);
  if (value !== undefined && typeof value !== 'string') {
    throw new TypeError(
      `Content metadata field "${String(key)}" must be a string.`,
    );
  }
  return value;
}

export function readOptionalBooleanProperty(
  object: object,
  key: PropertyKey,
): boolean | undefined {
  const value = readOwnDataProperty(object, key);
  if (value !== undefined && typeof value !== 'boolean') {
    throw new TypeError(
      `Content metadata field "${String(key)}" must be a boolean.`,
    );
  }
  return value;
}
