import type { ContentRecord, ImmutableDate } from './types.js';
import { readOptionalBooleanProperty } from './ownDataProperty.js';
import { inspectDate } from './runtimeBrands.js';

/**
 * A pure content collection transformation.
 *
 * @public
 */
export type ContentFilter<TRecord extends ContentRecord> = (
  data: readonly TRecord[],
) => readonly TRecord[];

/**
 * Minimal record accepted by publish-date sorting.
 *
 * @public
 */
export interface SortableContentRecord extends ContentRecord {
  /** Date-like value accepted by JavaScript date parsing. */
  readonly publishDate?: string | number | ImmutableDate;
}

/**
 * Exclude drafts, then apply filters and sorters without mutating the input.
 *
 * @public
 */
export function getPages<TRecord extends ContentRecord>(
  data: readonly TRecord[],
  filterFuncs: readonly ContentFilter<TRecord>[] = [],
  sortFuncs: readonly ContentFilter<TRecord>[] = [],
): readonly TRecord[] {
  let pages: readonly TRecord[] = data.filter(
    (item) => readOptionalBooleanProperty(item, 'draft') !== true,
  );
  for (const filterFunc of filterFuncs) pages = [...filterFunc(pages)];
  for (const sortFunc of sortFuncs) pages = [...sortFunc(pages)];
  return Object.freeze([...pages]);
}

/**
 * Create an equality filter for a typed record field.
 *
 * @public
 */
export function filterByKeyValue<
  TRecord extends ContentRecord,
  TKey extends keyof TRecord,
>(key: TKey, value: TRecord[TKey]): ContentFilter<TRecord> {
  return (data) =>
    Object.freeze(data.filter((item) => sameValueZero(item[key], value)));
}

/**
 * Create an inequality filter for a typed record field.
 *
 * @public
 */
export function filterByNotKeyValue<
  TRecord extends ContentRecord,
  TKey extends keyof TRecord,
>(key: TKey, value: TRecord[TKey]): ContentFilter<TRecord> {
  return (data) =>
    Object.freeze(data.filter((item) => !sameValueZero(item[key], value)));
}

function sameValueZero(left: unknown, right: unknown): boolean {
  return left === right || (left !== left && right !== right);
}

/** Extract the element type of a readonly array. @public */
export type ArrayElement<T> = T extends readonly (infer TItem)[]
  ? TItem
  : never;
/** Select record keys whose values are optional or required readonly arrays. @public */
export type ArrayKey<T> = {
  [TKey in keyof T]-?: T[TKey] extends readonly unknown[] | undefined
    ? TKey
    : never;
}[keyof T];

/**
 * Create a filter that matches an element in an array-valued field.
 *
 * @public
 */
export function filterByArrayValue<
  TRecord extends ContentRecord,
  TKey extends ArrayKey<TRecord>,
>(
  key: TKey,
  value: ArrayElement<NonNullable<TRecord[TKey]>>,
): ContentFilter<TRecord> {
  return (data) =>
    Object.freeze(
      data.filter((item) => {
        const values = item[key];
        return Array.isArray(values) && values.includes(value);
      }),
    );
}

function stableSort<T>(
  data: readonly T[],
  compare: (left: T, right: T) => number,
): readonly T[] {
  return Object.freeze(
    data
      .map((item, index) => ({ item, index }))
      .sort(
        (left, right) =>
          compare(left.item, right.item) || left.index - right.index,
      )
      .map(({ item }) => item),
  );
}

/**
 * Stable-sort records by optional numeric order from low to high.
 *
 * @public
 */
export function sortByOrderAscending<
  TRecord extends { readonly order?: number },
>(data: readonly TRecord[]): readonly TRecord[] {
  return stableSort(
    data,
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );
}

/**
 * Stable-sort records by optional numeric order from high to low.
 *
 * @public
 */
export function sortByOrderDescending<
  TRecord extends { readonly order?: number },
>(data: readonly TRecord[]): readonly TRecord[] {
  return stableSort(
    data,
    (left, right) => (right.order ?? 0) - (left.order ?? 0),
  );
}

function timestamp(value: unknown): number | undefined {
  const date = inspectDate(
    typeof value === 'number' || typeof value === 'string'
      ? new Date(value)
      : value,
  );
  const time = date.timestamp;
  return Number.isFinite(time) ? time : undefined;
}

function compareDates(
  left: unknown,
  right: unknown,
  direction: 1 | -1,
): number {
  const leftTime = timestamp(left);
  const rightTime = timestamp(right);
  if (leftTime === undefined) return rightTime === undefined ? 0 : 1;
  if (rightTime === undefined) return -1;
  return (leftTime - rightTime) * direction;
}

/**
 * Stable-sort publishable records newest first and place invalid dates last.
 *
 * @public
 */
export function sortByPublishDateDescending<
  TRecord extends SortableContentRecord,
>(data: readonly TRecord[]): readonly TRecord[] {
  return stableSort(data, (left, right) =>
    compareDates(left.publishDate, right.publishDate, -1),
  );
}

/**
 * Stable-sort records by a selected date-like field and place invalid dates last.
 *
 * @public
 */
export function sortByDate<TRecord>(
  data: readonly TRecord[],
  key: keyof TRecord,
  order: 'ascending' | 'descending' = 'ascending',
): readonly TRecord[] {
  return stableSort(data, (left, right) =>
    compareDates(left[key], right[key], order === 'ascending' ? 1 : -1),
  );
}

/**
 * Exclude a field value, remove drafts, and return highest-order records first.
 *
 * @public
 */
export function filterPagesNot<
  TRecord extends ContentRecord & { readonly order?: number },
  TKey extends keyof TRecord,
>(
  data: readonly TRecord[] | undefined,
  key: TKey,
  value: TRecord[TKey],
): readonly TRecord[] {
  return data
    ? getPages(data, [filterByNotKeyValue(key, value)], [sortByOrderDescending])
    : Object.freeze([]);
}

/**
 * Select a field value, remove drafts, and return highest-order records first.
 *
 * @public
 */
export function filterPages<
  TRecord extends ContentRecord & { readonly order?: number },
  TKey extends keyof TRecord,
>(
  data: readonly TRecord[] | undefined,
  key: TKey,
  value: TRecord[TKey],
): readonly TRecord[] {
  return data
    ? getPages(data, [filterByKeyValue(key, value)], [sortByOrderDescending])
    : Object.freeze([]);
}

/**
 * Return the highest-order non-draft record matching a field value.
 *
 * @public
 */
export function filterSingle<
  TRecord extends ContentRecord & { readonly order?: number },
  TKey extends keyof TRecord,
>(
  data: readonly TRecord[] | undefined,
  key: TKey,
  value: TRecord[TKey],
): TRecord | null {
  return data
    ? (getPages(
        data,
        [filterByKeyValue(key, value)],
        [sortByOrderDescending],
      )[0] ?? null)
    : null;
}
