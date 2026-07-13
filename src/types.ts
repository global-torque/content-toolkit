/**
 * Date view without methods that mutate its internal timestamp.
 *
 * @public
 */
export type ImmutableDate = Omit<
  Date,
  | 'setDate'
  | 'setFullYear'
  | 'setHours'
  | 'setMilliseconds'
  | 'setMinutes'
  | 'setMonth'
  | 'setSeconds'
  | 'setTime'
  | 'setUTCDate'
  | 'setUTCFullYear'
  | 'setUTCHours'
  | 'setUTCMilliseconds'
  | 'setUTCMinutes'
  | 'setUTCMonth'
  | 'setUTCSeconds'
  | 'setYear'
>;

/**
 * Recursively readonly view returned for detached content snapshots.
 *
 * @public
 */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends Date
    ? ImmutableDate
    : T extends readonly unknown[]
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : T extends object
        ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
        : T;

/**
 * Minimal record understood by the framework-independent content helpers.
 *
 * @public
 */
export interface ContentRecord {
  /** Public content path used for tree placement and navigation. */
  readonly url: string;
  /** Optional source path before host-specific public-path transformation. */
  readonly rawUrl?: string;
  /** Draft records are excluded by default by collection and tree helpers. */
  readonly draft?: boolean;
}
