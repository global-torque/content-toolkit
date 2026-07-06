import type { BaseFrontmatter } from './types.ts';
export type { BaseFrontmatter } from './types.ts';
export type ContentPathKey<TFrontmatter> = Extract<keyof TFrontmatter, string>;
export type ContentNodeKind = 'page' | 'virtual';
export type ContentNodePredicate<TFrontmatter extends BaseFrontmatter> = (node: ContentNode<TFrontmatter>) => boolean;
export type ContentFieldValue<TFrontmatter, TKey extends keyof TFrontmatter> = NonNullable<TFrontmatter[TKey]> extends readonly (infer TItem)[] ? TItem : TFrontmatter[TKey];
export interface ParentOptions {
    skipVirtual?: boolean;
}
export interface ChildOptions {
    includeVirtual?: boolean;
}
export interface ChildrenOptions<TFrontmatter extends BaseFrontmatter> {
    includeVirtual?: boolean;
    sort?: (a: ContentNode<TFrontmatter>, b: ContentNode<TFrontmatter>) => number;
}
export interface DescendantsOptions<TFrontmatter extends BaseFrontmatter> extends ChildrenOptions<TFrontmatter> {
    includeSelf?: boolean;
}
export interface SiblingOptions<TFrontmatter extends BaseFrontmatter> extends ChildrenOptions<TFrontmatter> {
    wrap?: boolean;
}
export interface FindOptions<TFrontmatter extends BaseFrontmatter> extends DescendantsOptions<TFrontmatter> {
    under?: string | ContentNode<TFrontmatter>;
    deep?: boolean;
    useIndex?: boolean;
}
export interface ContentTreeOptions<TFrontmatter extends BaseFrontmatter> {
    pathKey?: ContentPathKey<TFrontmatter>;
    sourcePathKey?: ContentPathKey<TFrontmatter>;
    indexKeys?: readonly (keyof TFrontmatter)[];
    includeDrafts?: boolean;
    duplicateUrl?: 'error' | 'first-wins' | 'last-wins';
    normalizePath?: (path: string) => string;
    sortSiblings?: (a: ContentNode<TFrontmatter>, b: ContentNode<TFrontmatter>) => number;
    wrapSiblings?: boolean;
}
export interface ContentNode<TFrontmatter extends BaseFrontmatter> {
    readonly kind: ContentNodeKind;
    readonly url: string;
    readonly segment: string;
    readonly data: TFrontmatter | undefined;
    readonly virtual: boolean;
    parent(options?: ParentOptions): ContentNode<TFrontmatter> | null;
    child(segment: string, options?: ChildOptions): ContentNode<TFrontmatter> | null;
    children(options?: ChildrenOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    descendants(options?: DescendantsOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    siblings(options?: SiblingOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    next(options?: SiblingOptions<TFrontmatter>): ContentNode<TFrontmatter> | null;
    previous(options?: SiblingOptions<TFrontmatter>): ContentNode<TFrontmatter> | null;
    find(predicate: ContentNodePredicate<TFrontmatter>, options?: FindOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    findBy<TKey extends keyof TFrontmatter>(key: TKey, value: ContentFieldValue<TFrontmatter, TKey>, options?: FindOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    firstBy<TKey extends keyof TFrontmatter>(key: TKey, value: ContentFieldValue<TFrontmatter, TKey>, options?: FindOptions<TFrontmatter>): ContentNode<TFrontmatter> | null;
    hasChildren(options?: ChildrenOptions<TFrontmatter>): boolean;
}
export interface ContentTree<TFrontmatter extends BaseFrontmatter> {
    readonly root: ContentNode<TFrontmatter>;
    readonly items: readonly TFrontmatter[];
    getByUrl(url: string): ContentNode<TFrontmatter> | null;
    getBySourcePath(path: string): ContentNode<TFrontmatter> | null;
    get(path: string): ContentNode<TFrontmatter> | null;
    children(path: string, options?: ChildrenOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    descendants(path: string, options?: DescendantsOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    parent(path: string, options?: ParentOptions): ContentNode<TFrontmatter> | null;
    next(path: string, options?: SiblingOptions<TFrontmatter>): ContentNode<TFrontmatter> | null;
    previous(path: string, options?: SiblingOptions<TFrontmatter>): ContentNode<TFrontmatter> | null;
    find(predicate: ContentNodePredicate<TFrontmatter>, options?: FindOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    findBy<TKey extends keyof TFrontmatter>(key: TKey, value: ContentFieldValue<TFrontmatter, TKey>, options?: FindOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
    firstBy<TKey extends keyof TFrontmatter>(key: TKey, value: ContentFieldValue<TFrontmatter, TKey>, options?: FindOptions<TFrontmatter>): ContentNode<TFrontmatter> | null;
}
export declare function normalizeContentPath(path: string): string;
export declare function splitContentPath(path: string, normalizePath?: (value: string) => string): string[];
export declare function createContentTree<TFrontmatter extends BaseFrontmatter>(items: readonly TFrontmatter[], options?: ContentTreeOptions<TFrontmatter>): ContentTree<TFrontmatter>;
//# sourceMappingURL=pages.d.ts.map