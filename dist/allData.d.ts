import type { BaseFrontmatter } from './types.js';
export type ContentFilter<TFrontmatter extends BaseFrontmatter> = (data: TFrontmatter[]) => TFrontmatter[];
export interface SortableFrontmatter extends BaseFrontmatter {
    publishDate?: string | number | Date;
}
export declare function getPages<TFrontmatter extends BaseFrontmatter>(data: TFrontmatter[], filterFuncs?: ContentFilter<TFrontmatter>[], sortFuncs?: ContentFilter<TFrontmatter>[]): TFrontmatter[];
export declare function filterByKeyVal<TFrontmatter extends BaseFrontmatter>(key: keyof TFrontmatter, val: TFrontmatter[keyof TFrontmatter]): (data: TFrontmatter[]) => TFrontmatter[];
export declare function filterByNotKeyVal<TFrontmatter extends BaseFrontmatter>(key: keyof TFrontmatter, val: TFrontmatter[keyof TFrontmatter]): (data: TFrontmatter[]) => TFrontmatter[];
export declare function filterItemsArrayByKey<TFrontmatter extends BaseFrontmatter>(key: keyof TFrontmatter, val: string): (data: TFrontmatter[]) => TFrontmatter[];
export declare function sortByOrderAscending<TFrontmatter extends Pick<BaseFrontmatter, 'order'>>(data: TFrontmatter[]): TFrontmatter[];
export declare function sortByOrderDescending<TFrontmatter extends Pick<BaseFrontmatter, 'order'>>(data: TFrontmatter[]): TFrontmatter[];
export declare const sortByOrder: typeof sortByOrderDescending;
export declare function sortByPublishDateDescending<TFrontmatter extends SortableFrontmatter>(data: TFrontmatter[]): TFrontmatter[];
export declare const sortByPublishDate: typeof sortByPublishDateDescending;
export declare function sortByDate<TData extends Record<string, unknown>>(data: TData[], key: keyof TData, order?: 'ascending' | 'descending'): TData[];
export declare function filterPagesNot<TFrontmatter extends BaseFrontmatter>(data: TFrontmatter[], key: keyof TFrontmatter, val: TFrontmatter[keyof TFrontmatter]): TFrontmatter[];
export declare function filterPages<TFrontmatter extends BaseFrontmatter>(data: TFrontmatter[], key: keyof TFrontmatter, val: TFrontmatter[keyof TFrontmatter]): TFrontmatter[];
export declare function filterSingle<TFrontmatter extends BaseFrontmatter>(data: TFrontmatter[], key: keyof TFrontmatter, val: TFrontmatter[keyof TFrontmatter]): TFrontmatter | null;
//# sourceMappingURL=allData.d.ts.map