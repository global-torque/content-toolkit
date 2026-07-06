import type { BaseFrontmatter } from './types.js';

export type ContentFilter<TFrontmatter extends BaseFrontmatter> = (
  data: TFrontmatter[]
) => TFrontmatter[];

export interface SortableFrontmatter extends BaseFrontmatter {
  publishDate?: string | number | Date;
}

export function getPages<TFrontmatter extends BaseFrontmatter>(
  data: TFrontmatter[],
  filterFuncs: ContentFilter<TFrontmatter>[] = [],
  sortFuncs: ContentFilter<TFrontmatter>[] = [],
) {
  let pages = data.filter((item) => item.draft !== true);

  filterFuncs.forEach((filterFunc) => {
    pages = filterFunc(pages);
  });
  sortFuncs.forEach((sortFunc) => {
    pages = sortFunc(pages);
  });

  return pages;
}

export function filterByKeyVal<TFrontmatter extends BaseFrontmatter>(
  key: keyof TFrontmatter,
  val: TFrontmatter[keyof TFrontmatter],
) {
  return (data: TFrontmatter[]) => data.filter((item) => item[key] === val);
}

export function filterByNotKeyVal<TFrontmatter extends BaseFrontmatter>(
  key: keyof TFrontmatter,
  val: TFrontmatter[keyof TFrontmatter],
) {
  return (data: TFrontmatter[]) => data.filter((item) => item[key] !== val);
}

export function filterItemsArrayByKey<TFrontmatter extends BaseFrontmatter>(
  key: keyof TFrontmatter,
  val: string,
) {
  return (data: TFrontmatter[]) => {
    if (val === '') {
      return data;
    }

    return data.filter((item) => {
      const values = Array.isArray(item[key])
        ? (item[key] as string[]).map((tag: string) => String(tag).toLowerCase())
        : [];
      return values.includes(val.toLowerCase());
    });
  };
}

export function sortByOrderAscending<TFrontmatter extends Pick<BaseFrontmatter, 'order'>>(
  data: TFrontmatter[],
) {
  return data.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function sortByOrderDescending<TFrontmatter extends Pick<BaseFrontmatter, 'order'>>(
  data: TFrontmatter[],
) {
  return data.sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
}

export const sortByOrder = sortByOrderDescending;

export function sortByPublishDateDescending<TFrontmatter extends SortableFrontmatter>(
  data: TFrontmatter[],
) {
  return data.sort((a, b) => {
    const dateA = new Date(String(a.publishDate || ''));
    const dateB = new Date(String(b.publishDate || ''));
    const timeA = Number.isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    const timeB = Number.isNaN(dateB.getTime()) ? 0 : dateB.getTime();

    return timeB - timeA;
  });
}

export const sortByPublishDate = sortByPublishDateDescending;

export function sortByDate<TData extends Record<string, unknown>>(
  data: TData[],
  key: keyof TData,
  order: 'ascending' | 'descending' = 'ascending',
) {
  if (order === 'ascending') {
    return data.sort((a, b) => (
      +new Date(String(a[key])) - +new Date(String(b[key]))
    ));
  }

  return data.sort((a, b) => (
    +new Date(String(b[key])) - +new Date(String(a[key]))
  ));
}

export function filterPagesNot<TFrontmatter extends BaseFrontmatter>(
  data: TFrontmatter[],
  key: keyof TFrontmatter,
  val: TFrontmatter[keyof TFrontmatter],
) {
  if (!data) return [];
  return getPages(data, [filterByNotKeyVal(key, val)], [sortByOrderDescending]);
}

export function filterPages<TFrontmatter extends BaseFrontmatter>(
  data: TFrontmatter[],
  key: keyof TFrontmatter,
  val: TFrontmatter[keyof TFrontmatter],
) {
  if (!data) return [];
  return getPages(data, [filterByKeyVal(key, val)], [sortByOrderDescending]);
}

export function filterSingle<TFrontmatter extends BaseFrontmatter>(
  data: TFrontmatter[],
  key: keyof TFrontmatter,
  val: TFrontmatter[keyof TFrontmatter],
) {
  if (!data) return null;
  const res = getPages(data, [filterByKeyVal(key, val)], [sortByOrderDescending]);

  return res[0] ?? null;
}
