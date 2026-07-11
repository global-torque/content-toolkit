import { createContentSnapshotWithOverrides } from './immutable.js';
import {
  readOptionalBooleanProperty,
  readOptionalStringProperty,
  readOwnDataProperty,
} from './ownDataProperty.js';
import type { ContentRecord, DeepReadonly } from './types.js';

export type { ContentRecord, DeepReadonly } from './types.js';

/** String-valued field used as a tree or source path. @public */
export type ContentPathKey<TFrontmatter> = Extract<
  string extends keyof TFrontmatter
    ? string
    : {
        [TKey in keyof TFrontmatter]-?: Exclude<
          TFrontmatter[TKey],
          undefined
        > extends string
          ? TKey
          : never;
      }[keyof TFrontmatter],
  string
>;
/** Page-backed or generated virtual node classification. @public */
export type ContentNodeKind = 'page' | 'virtual';
/** Policy applied when normalized paths collide. @public */
export type DuplicateContentPathPolicy = 'error' | 'first-wins' | 'last-wins';
/** Policy controlling whether a terminal `/index` remains a node. @public */
export type IndexPagePolicy = 'collapse' | 'preserve';

/**
 * Typed failure for missing record paths or required tree lookups.
 *
 * @public
 */
export class MissingContentPathError extends Error {
  /** Missing normalized path, or an empty string for a missing record field. */
  public readonly path: string;

  /** Record field that was missing when construction failed. */
  public readonly pathKey: string | undefined;

  public constructor(path: string, pathKey?: string) {
    super(
      pathKey
        ? `Content item is missing a string "${pathKey}" path.`
        : `Content path "${path}" does not exist.`,
    );
    this.name = 'MissingContentPathError';
    this.path = path;
    this.pathKey = pathKey;
  }
}

/**
 * Typed failure for a normalized tree, URL, or source-path collision.
 *
 * @public
 */
export class DuplicateContentPathError extends Error {
  /** Colliding normalized path. */
  public readonly path: string;

  /** Index in which the collision occurred. */
  public readonly index: 'tree' | 'url' | 'source';

  public constructor(path: string, index: 'tree' | 'url' | 'source' = 'tree') {
    super(
      `Duplicate normalized content ${index === 'tree' ? 'path' : index} "${path}".`,
    );
    this.name = 'DuplicateContentPathError';
    this.path = path;
    this.index = index;
  }
}
/** Predicate used by tree and node search operations. @public */
export type ContentNodePredicate<TFrontmatter extends ContentRecord> = (
  node: ContentNode<TFrontmatter>,
) => boolean;
/** Scalar or array-element value accepted by a typed field search. @public */
export type ContentFieldValue<
  TFrontmatter,
  TKey extends keyof TFrontmatter,
> = TFrontmatter[TKey] extends infer TValue
  ? TValue extends readonly (infer TItem)[]
    ? TItem
    : TValue
  : never;

/** Options for resolving a node parent. @public */
export interface ParentOptions {
  /** Skip generated virtual ancestors. Defaults to `true`. */
  skipVirtual?: boolean;
}

/** Options for resolving a direct child. @public */
export interface ChildOptions {
  /** Return a generated virtual child. Defaults to `false`. */
  includeVirtual?: boolean;
}

/** Options for listing direct children. @public */
export interface ChildrenOptions<TFrontmatter extends ContentRecord> {
  /** Include generated virtual nodes. Defaults to `false`. */
  includeVirtual?: boolean;
  /** Sort only the returned snapshot without changing cached tree order. */
  sort?: (a: ContentNode<TFrontmatter>, b: ContentNode<TFrontmatter>) => number;
}

/** Options for recursively listing descendants. @public */
export interface DescendantsOptions<
  TFrontmatter extends ContentRecord,
> extends ChildrenOptions<TFrontmatter> {
  /** Include the search root itself when it satisfies virtual-node policy. */
  includeSelf?: boolean;
}

/** Options for sibling lists and next/previous traversal. @public */
export interface SiblingOptions<
  TFrontmatter extends ContentRecord,
> extends ChildrenOptions<TFrontmatter> {
  /** Override the tree's next/previous wrapping policy. */
  wrap?: boolean;
}

/** Options controlling search scope, depth, indexing, and order. @public */
export interface FindOptions<
  TFrontmatter extends ContentRecord,
> extends DescendantsOptions<TFrontmatter> {
  /** Restrict results to descendants of a path or node. */
  under?: string | ContentNode<TFrontmatter>;
  /** Search recursively; `false` searches direct children only. */
  deep?: boolean;
  /** Use a configured field index when possible. Defaults to `true`. */
  useIndex?: boolean;
}

/** Search controls available on a node whose subtree is already the scope. @public */
export type NodeFindOptions<TFrontmatter extends ContentRecord> = Omit<
  FindOptions<TFrontmatter>,
  'under'
>;

/**
 * Host-controlled construction policy for an immutable content tree.
 *
 * @public
 */
export interface ContentTreeOptions<TFrontmatter extends ContentRecord> {
  /** Record field used for tree placement. Defaults to `url`. */
  pathKey?: ContentPathKey<TFrontmatter>;
  /** Record field indexed as the source path. Defaults to `rawUrl`. */
  sourcePathKey?: ContentPathKey<TFrontmatter>;
  /** Additional primitive or primitive-array fields to index. */
  indexKeys?: readonly (keyof TFrontmatter)[];
  /** Retain records marked `draft: true`. Defaults to `false`. */
  includeDrafts?: boolean;
  /** Resolve normalized path collisions. Defaults to `error`. */
  duplicatePath?: DuplicateContentPathPolicy;
  /** Collapse or preserve terminal index nodes. Defaults to `collapse`. */
  indexPage?: IndexPagePolicy;
  /** Canonicalize each input or lookup path exactly once. */
  normalizePath?: (path: string) => string;
  /** Establish cached sibling order during construction. */
  sortSiblings?: (
    a: ContentNode<TFrontmatter>,
    b: ContentNode<TFrontmatter>,
  ) => number;
  /** Wrap next/previous traversal at collection boundaries. Defaults to `true`. */
  wrapSiblings?: boolean;
}

/**
 * Immutable page or virtual-folder node with scoped traversal helpers.
 *
 * @public
 */
export interface ContentNode<TFrontmatter extends ContentRecord> {
  /** Whether the node contains a record or represents a generated folder. */
  readonly kind: ContentNodeKind;
  /** Canonical root-absolute tree path. */
  readonly url: string;
  /** Final path segment, or an empty string for the root. */
  readonly segment: string;
  /** Deep-readonly detached record, absent on a virtual node. */
  readonly data: DeepReadonly<TFrontmatter> | undefined;
  /** `true` when no record directly backs the node. */
  readonly virtual: boolean;

  /** Resolve the parent according to virtual-node policy. */
  parent(options?: ParentOptions): ContentNode<TFrontmatter> | null;
  /** Resolve one direct child by segment. */
  child(
    segment: string,
    options?: ChildOptions,
  ): ContentNode<TFrontmatter> | null;
  /** Return a frozen snapshot of direct children. */
  children(
    options?: ChildrenOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Return a frozen depth-first descendant snapshot. */
  descendants(
    options?: DescendantsOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Return a frozen snapshot of nodes sharing the same parent. */
  siblings(
    options?: SiblingOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Resolve the next sibling. */
  next(
    options?: SiblingOptions<TFrontmatter>,
  ): ContentNode<TFrontmatter> | null;
  /** Resolve the previous sibling. */
  previous(
    options?: SiblingOptions<TFrontmatter>,
  ): ContentNode<TFrontmatter> | null;
  /** Search within this node's subtree. */
  find(
    predicate: ContentNodePredicate<TFrontmatter>,
    options?: NodeFindOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Search a typed field within this node's subtree. */
  findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: NodeFindOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Return the first typed-field match within this node's subtree. */
  firstBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: NodeFindOptions<TFrontmatter>,
  ): ContentNode<TFrontmatter> | null;
  /** Report whether visible direct children exist. */
  hasChildren(options?: ChildrenOptions<TFrontmatter>): boolean;
}

/**
 * Immutable tree snapshot with path indexes and typed search helpers.
 *
 * @public
 */
export interface ContentTree<TFrontmatter extends ContentRecord> {
  /** Root node, optionally backed by the `/` record. */
  readonly root: ContentNode<TFrontmatter>;
  /** Frozen deep-readonly snapshots accepted into the tree. */
  readonly items: readonly DeepReadonly<TFrontmatter>[];

  /** Look up a record by its normalized public URL. */
  getByUrl(url: string): ContentNode<TFrontmatter> | null;
  /** Look up a record by its normalized source path. */
  getBySourcePath(path: string): ContentNode<TFrontmatter> | null;
  /** Look up any page or virtual node by tree path. */
  get(path: string): ContentNode<TFrontmatter> | null;
  /** Look up a tree path or throw `MissingContentPathError`. */
  require(path: string): ContentNode<TFrontmatter>;
  /** Return direct children for a tree path. */
  children(
    path: string,
    options?: ChildrenOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Return recursive descendants for a tree path. */
  descendants(
    path: string,
    options?: DescendantsOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Return the parent for a tree path. */
  parent(
    path: string,
    options?: ParentOptions,
  ): ContentNode<TFrontmatter> | null;
  /** Return the next sibling for a tree path. */
  next(
    path: string,
    options?: SiblingOptions<TFrontmatter>,
  ): ContentNode<TFrontmatter> | null;
  /** Return the previous sibling for a tree path. */
  previous(
    path: string,
    options?: SiblingOptions<TFrontmatter>,
  ): ContentNode<TFrontmatter> | null;
  /** Search the tree with a predicate. */
  find(
    predicate: ContentNodePredicate<TFrontmatter>,
    options?: FindOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Search a typed record field, using an index when configured. */
  findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: FindOptions<TFrontmatter>,
  ): readonly ContentNode<TFrontmatter>[];
  /** Return the first typed-field match. */
  firstBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: FindOptions<TFrontmatter>,
  ): ContentNode<TFrontmatter> | null;
}

interface ResolvedContentTreeOptions<TFrontmatter extends ContentRecord> {
  pathKey: ContentPathKey<TFrontmatter>;
  sourcePathKey: ContentPathKey<TFrontmatter>;
  indexKeys: readonly (keyof TFrontmatter)[];
  includeDrafts: boolean;
  duplicatePath: DuplicateContentPathPolicy;
  normalizePath: (path: string) => string;
  sortSiblings:
    | ((a: ContentNode<TFrontmatter>, b: ContentNode<TFrontmatter>) => number)
    | undefined;
  wrapSiblings: boolean;
}

interface PreparedContentItem<TFrontmatter extends ContentRecord> {
  item: DeepReadonly<TFrontmatter>;
  path: string;
}

interface ContentNodeConstructorOptions<TFrontmatter extends ContentRecord> {
  url: string;
  segment: string;
  parent: ContentNodeImpl<TFrontmatter> | null;
  tree: ContentTreeImpl<TFrontmatter>;
  data?: DeepReadonly<TFrontmatter>;
  virtual?: boolean;
}

const DEFAULT_INDEX_KEYS = ['url', 'rawUrl'] as const;
const CONTENT_TREE_MUTATION_TOKEN = Symbol('content-tree-mutation');

/** Options for canonical tree-path normalization. @public */
export interface NormalizeContentPathOptions {
  /** Collapse or preserve a terminal `/index`. */
  indexPage?: IndexPagePolicy;
}

/**
 * Normalize a root-absolute tree path and apply the configured index policy.
 *
 * @public
 */
export function normalizeContentPath(
  path: string,
  options: NormalizeContentPathOptions = {},
): string {
  const [withoutQuery] = path.trim().split(/[?#]/);
  let normalized =
    withoutQuery === undefined || withoutQuery === '' ? '/' : withoutQuery;

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/{2,}/g, '/');

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  if ((options.indexPage ?? 'collapse') === 'collapse') {
    normalized = normalized.replace(/\/index$/i, '') || '/';
  }

  return assertNormalizedTreePath(normalized || '/');
}

/**
 * Normalize a tree path once and split it into non-empty segments.
 *
 * @public
 */
export function splitContentPath(
  path: string,
  normalizePath: (value: string) => string = normalizeContentPath,
): readonly string[] {
  return splitNormalizedContentPath(
    assertNormalizedTreePath(normalizePath(path)),
  );
}

function splitNormalizedContentPath(normalized: string): readonly string[] {
  return freezeArray(normalized === '/' ? [] : normalized.slice(1).split('/'));
}

function getUrlSegment(url: string): string {
  const segments = splitNormalizedContentPath(url);
  return segments.at(-1) ?? '';
}

function joinContentPath(parentUrl: string, segment: string): string {
  return parentUrl === '/' ? `/${segment}` : `${parentUrl}/${segment}`;
}

function uniqueKeys<TFrontmatter extends ContentRecord>(
  keys: readonly (keyof TFrontmatter | undefined)[],
): readonly (keyof TFrontmatter)[] {
  return [
    ...new Set(
      keys.filter((key): key is keyof TFrontmatter => key !== undefined),
    ),
  ];
}

function assertNormalizedTreePath(path: string): string {
  if (typeof path !== 'string') {
    throw new TypeError('A content-tree path normalizer must return a string.');
  }
  if (
    !path.startsWith('/') ||
    /[?#]/.test(path) ||
    path.includes('\\') ||
    hasControlCharacters(path) ||
    path.includes('//') ||
    (path.length > 1 && path.endsWith('/'))
  ) {
    throw new TypeError(
      'A normalized content-tree path must be a canonical root-absolute path.',
    );
  }

  if (
    splitNormalizedContentPath(path).some((segment) => {
      if (segment.trim() !== segment) {
        return true;
      }
      const decodedDots = segment.replace(/%2e/gi, '.');
      return decodedDots === '.' || decodedDots === '..';
    })
  ) {
    throw new TypeError(
      'A normalized content-tree path must not contain boundary whitespace or dot segments.',
    );
  }

  return path;
}

function hasControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      return true;
    }
  }
  return false;
}

function sameValueZero(left: unknown, right: unknown): boolean {
  return left === right || (left !== left && right !== right);
}

function resolveOptions<TFrontmatter extends ContentRecord>(
  options: ContentTreeOptions<TFrontmatter> = {},
): ResolvedContentTreeOptions<TFrontmatter> {
  const pathKey = options.pathKey ?? ('url' as ContentPathKey<TFrontmatter>);
  const sourcePathKey =
    options.sourcePathKey ?? ('rawUrl' as ContentPathKey<TFrontmatter>);
  const indexKeys = uniqueKeys<TFrontmatter>([
    pathKey,
    sourcePathKey,
    ...(options.indexKeys ?? []),
    ...DEFAULT_INDEX_KEYS,
  ]);
  const indexPage = options.indexPage ?? 'collapse';
  const normalizePath =
    options.normalizePath ??
    ((path: string) =>
      normalizeContentPath(path, {
        indexPage,
      }));

  return {
    pathKey,
    sourcePathKey,
    indexKeys,
    includeDrafts: options.includeDrafts ?? false,
    duplicatePath: options.duplicatePath ?? 'error',
    normalizePath: (path) => assertNormalizedTreePath(normalizePath(path)),
    sortSiblings: options.sortSiblings,
    wrapSiblings: options.wrapSiblings ?? true,
  };
}

function toDirectSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

function freezeArray<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

function getSnapshotField<TRecord extends ContentRecord>(
  data: DeepReadonly<TRecord>,
  key: keyof TRecord,
): unknown {
  return Object.getOwnPropertyDescriptor(data, key)?.value as unknown;
}

class ContentNodeImpl<
  TFrontmatter extends ContentRecord,
> implements ContentNode<TFrontmatter> {
  public kind: ContentNodeKind;

  public url: string;

  public segment: string;

  public data: DeepReadonly<TFrontmatter> | undefined;

  public virtual: boolean;

  readonly #childrenBySegment = new Map<
    string,
    ContentNodeImpl<TFrontmatter>
  >();

  readonly #parentNode: ContentNodeImpl<TFrontmatter> | null;

  readonly #tree: ContentTreeImpl<TFrontmatter>;

  #cachedChildrenWithVirtual: readonly ContentNodeImpl<TFrontmatter>[] | null =
    null;

  #cachedChildrenWithoutVirtual:
    readonly ContentNodeImpl<TFrontmatter>[] | null = null;

  #cachedDescendantsWithVirtual:
    readonly ContentNodeImpl<TFrontmatter>[] | null = null;

  #cachedDescendantsWithoutVirtual:
    readonly ContentNodeImpl<TFrontmatter>[] | null = null;

  #finalized = false;

  public constructor(
    options: ContentNodeConstructorOptions<TFrontmatter>,
    token: symbol,
  ) {
    if (token !== CONTENT_TREE_MUTATION_TOKEN) {
      throw new TypeError(
        'Content tree nodes cannot be constructed outside their owning tree.',
      );
    }
    this.data = options.data;
    this.virtual = options.virtual ?? options.data === undefined;
    this.kind = this.virtual ? 'virtual' : 'page';
    this.url = options.url;
    this.segment = options.segment;
    this.#parentNode = options.parent;
    this.#tree = options.tree;
  }

  public parent(options: ParentOptions = {}): ContentNode<TFrontmatter> | null {
    const skipVirtual = options.skipVirtual ?? true;
    let currentParent = this.#parentNode;

    while (skipVirtual && currentParent?.virtual) {
      currentParent = currentParent.#parentNode;
    }

    return currentParent;
  }

  public child(
    segment: string,
    options: ChildOptions = {},
  ): ContentNode<TFrontmatter> | null {
    const child = this.#childrenBySegment.get(toDirectSegment(segment)) ?? null;

    if (child?.virtual && options.includeVirtual !== true) {
      return null;
    }

    return child;
  }

  public children(
    options: ChildrenOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    return this.getChildren(options);
  }

  public descendants(
    options: DescendantsOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    const includeVirtual = options.includeVirtual === true;
    const includeSelf = options.includeSelf === true;
    const hasCustomSort = typeof options.sort === 'function';
    let descendants = includeVirtual
      ? this.#cachedDescendantsWithVirtual
      : this.#cachedDescendantsWithoutVirtual;

    if (!descendants) {
      descendants = this.collectDescendants(includeVirtual);

      if (includeVirtual) {
        this.#cachedDescendantsWithVirtual = descendants;
      } else {
        this.#cachedDescendantsWithoutVirtual = descendants;
      }
    }

    const result = [
      ...(includeSelf && (includeVirtual || !this.virtual) ? [this] : []),
      ...descendants,
    ];

    return freezeArray(hasCustomSort ? result.sort(options.sort) : result);
  }

  public siblings(
    options: SiblingOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    if (!this.#parentNode) {
      return freezeArray([]);
    }

    return freezeArray(
      this.#parentNode.children(options).filter((sibling) => sibling !== this),
    );
  }

  public next(
    options: SiblingOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    return this.getSiblingByOffset(1, options);
  }

  public previous(
    options: SiblingOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    return this.getSiblingByOffset(-1, options);
  }

  public find(
    predicate: ContentNodePredicate<TFrontmatter>,
    options: NodeFindOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    return this.#tree.find(predicate, {
      ...options,
      under: this,
    });
  }

  public findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options: NodeFindOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    return this.#tree.findBy(key, value, {
      ...options,
      under: this,
    });
  }

  public firstBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options: NodeFindOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    return this.findBy(key, value, options)[0] ?? null;
  }

  public hasChildren(options: ChildrenOptions<TFrontmatter> = {}): boolean {
    return this.children(options).length > 0;
  }

  public addChild(child: ContentNodeImpl<TFrontmatter>, token: symbol): void {
    this.assertMutable(token);
    this.#childrenBySegment.set(child.segment, child);
    this.clearCaches();
  }

  public childBySegment(
    segment: string,
  ): ContentNodeImpl<TFrontmatter> | undefined {
    return this.#childrenBySegment.get(segment);
  }

  public rawParent(): ContentNodeImpl<TFrontmatter> | null {
    return this.#parentNode;
  }

  public setData(
    data: DeepReadonly<TFrontmatter>,
    url: string,
    token: symbol,
  ): void {
    this.assertMutable(token);
    this.data = data;
    this.url = url;
    this.segment = getUrlSegment(url);
    this.virtual = false;
    this.kind = 'page';
    this.clearCaches();
  }

  public sortDeep(
    sortSiblings?: (
      a: ContentNode<TFrontmatter>,
      b: ContentNode<TFrontmatter>,
    ) => number,
    token?: symbol,
  ): void {
    this.assertMutable(token);
    if (sortSiblings) {
      const sortedEntries = [...this.#childrenBySegment.entries()].sort(
        ([, a], [, b]) => sortSiblings(a, b),
      );
      this.#childrenBySegment.clear();
      sortedEntries.forEach(([segment, child]) => {
        this.#childrenBySegment.set(segment, child);
      });
    }

    this.clearCaches();
    this.#childrenBySegment.forEach((child) =>
      child.sortDeep(sortSiblings, token),
    );
  }

  public lockPublicFieldsDeep(token: symbol): void {
    this.assertMutable(token);
    this.lockPublicFields();
    this.#childrenBySegment.forEach((child) =>
      child.lockPublicFieldsDeep(token),
    );
    Object.freeze(this);
  }

  public finalizeDeep(token: symbol): void {
    this.assertMutable(token);
    this.#childrenBySegment.forEach((child) => child.finalizeDeep(token));
    this.lockPublicFields();
    this.#finalized = true;
    Object.freeze(this);
  }

  private getChildren(
    options: ChildrenOptions<TFrontmatter> = {},
  ): readonly ContentNodeImpl<TFrontmatter>[] {
    const includeVirtual = options.includeVirtual === true;
    const hasCustomSort = typeof options.sort === 'function';
    let children = includeVirtual
      ? this.#cachedChildrenWithVirtual
      : this.#cachedChildrenWithoutVirtual;

    if (!children) {
      const values = [...this.#childrenBySegment.values()];
      children = freezeArray(
        includeVirtual ? values : values.filter((child) => !child.virtual),
      );

      if (includeVirtual) {
        this.#cachedChildrenWithVirtual = children;
      } else {
        this.#cachedChildrenWithoutVirtual = children;
      }
    }

    return hasCustomSort
      ? freezeArray([...children].sort(options.sort))
      : children;
  }

  private collectDescendants(
    includeVirtual: boolean,
  ): readonly ContentNodeImpl<TFrontmatter>[] {
    const descendants: ContentNodeImpl<TFrontmatter>[] = [];

    this.#childrenBySegment.forEach((child) => {
      if (includeVirtual || !child.virtual) {
        descendants.push(child);
      }

      descendants.push(...child.collectDescendants(includeVirtual));
    });

    return freezeArray(descendants);
  }

  private getSiblingByOffset(
    offset: 1 | -1,
    options: SiblingOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    if (!this.#parentNode) {
      return null;
    }

    const siblings = this.#parentNode.children(options);
    const index = siblings.findIndex((sibling) => sibling === this);

    if (index === -1 || siblings.length <= 1) {
      return null;
    }

    const nextIndex = index + offset;

    if (nextIndex >= 0 && nextIndex < siblings.length) {
      return siblings[nextIndex] ?? null;
    }

    const shouldWrap = options.wrap ?? this.#tree.wrapSiblings;

    if (!shouldWrap) {
      return null;
    }

    return (offset === 1 ? siblings[0] : siblings[siblings.length - 1]) ?? null;
  }

  private clearCaches(): void {
    this.#cachedChildrenWithVirtual = null;
    this.#cachedChildrenWithoutVirtual = null;
    this.#cachedDescendantsWithVirtual = null;
    this.#cachedDescendantsWithoutVirtual = null;
  }

  private assertMutable(token: symbol | undefined): void {
    if (token !== CONTENT_TREE_MUTATION_TOKEN || this.#finalized) {
      throw new TypeError('Content tree nodes are immutable.');
    }
  }

  private lockPublicFields(): void {
    (['kind', 'url', 'segment', 'data', 'virtual'] as const).forEach((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(this, key);

      if (descriptor?.writable === false) {
        return;
      }

      Object.defineProperty(this, key, {
        configurable: false,
        enumerable: true,
        writable: false,
        value: this[key],
      });
    });
  }
}

class ContentTreeImpl<
  TFrontmatter extends ContentRecord,
> implements ContentTree<TFrontmatter> {
  public readonly root: ContentNodeImpl<TFrontmatter>;

  public readonly items: readonly DeepReadonly<TFrontmatter>[];

  public readonly wrapSiblings: boolean;

  readonly #options: ResolvedContentTreeOptions<TFrontmatter>;

  readonly #byPath = new Map<string, ContentNodeImpl<TFrontmatter>>();

  readonly #byUrl = new Map<string, ContentNodeImpl<TFrontmatter>>();

  readonly #bySourcePath = new Map<string, ContentNodeImpl<TFrontmatter>>();

  readonly #byKey = new Map<
    keyof TFrontmatter,
    Map<unknown, ContentNodeImpl<TFrontmatter>[]>
  >();

  readonly #normalizedPathValuesByNode = new WeakMap<
    ContentNodeImpl<TFrontmatter>,
    ReadonlyMap<keyof TFrontmatter, string>
  >();

  readonly #ownedNodes = new WeakSet<ContentNodeImpl<TFrontmatter>>();

  #allNodes: readonly ContentNodeImpl<TFrontmatter>[] = freezeArray([]);

  public constructor(
    items: readonly TFrontmatter[],
    options: ContentTreeOptions<TFrontmatter> = {},
  ) {
    this.#options = resolveOptions(options);
    this.wrapSiblings = this.#options.wrapSiblings;
    this.root = new ContentNodeImpl<TFrontmatter>(
      {
        url: '/',
        segment: '',
        parent: null,
        tree: this,
        virtual: true,
      },
      CONTENT_TREE_MUTATION_TOKEN,
    );
    this.#byPath.set('/', this.root);

    const preparedItems = this.prepareItems(items);
    this.items = freezeArray(preparedItems.map(({ item }) => item));

    preparedItems.forEach(({ item, path }) => {
      this.insertItem(item, path);
    });

    this.root.lockPublicFieldsDeep(CONTENT_TREE_MUTATION_TOKEN);
    this.root.sortDeep(this.#options.sortSiblings, CONTENT_TREE_MUTATION_TOKEN);
    this.indexTree();
    this.root.finalizeDeep(CONTENT_TREE_MUTATION_TOKEN);
    Object.freeze(this);
  }

  public getByUrl(url: string): ContentNode<TFrontmatter> | null {
    return (
      this.#byUrl.get(url) ??
      this.#byUrl.get(this.#options.normalizePath(url)) ??
      null
    );
  }

  public getBySourcePath(path: string): ContentNode<TFrontmatter> | null {
    return (
      this.#bySourcePath.get(path) ??
      this.#bySourcePath.get(this.#options.normalizePath(path)) ??
      null
    );
  }

  public get(path: string): ContentNode<TFrontmatter> | null {
    return (
      this.#byPath.get(path) ??
      this.#byPath.get(this.#options.normalizePath(path)) ??
      null
    );
  }

  public require(path: string): ContentNode<TFrontmatter> {
    const exactNode = this.#byPath.get(path);
    if (exactNode) {
      return exactNode;
    }
    const normalizedPath = this.#options.normalizePath(path);
    const node = this.#byPath.get(normalizedPath) ?? null;
    if (!node) {
      throw new MissingContentPathError(normalizedPath);
    }
    return node;
  }

  public children(
    path: string,
    options: ChildrenOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    return this.get(path)?.children(options) ?? freezeArray([]);
  }

  public descendants(
    path: string,
    options: DescendantsOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    return this.get(path)?.descendants(options) ?? freezeArray([]);
  }

  public parent(
    path: string,
    options: ParentOptions = {},
  ): ContentNode<TFrontmatter> | null {
    return this.get(path)?.parent(options) ?? null;
  }

  public next(
    path: string,
    options: SiblingOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    return this.get(path)?.next(options) ?? null;
  }

  public previous(
    path: string,
    options: SiblingOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    return this.get(path)?.previous(options) ?? null;
  }

  public find(
    predicate: ContentNodePredicate<TFrontmatter>,
    options: FindOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    const result = this.getSearchSpace(options).filter(predicate);
    return this.sortResult(result, options.sort);
  }

  public findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options: FindOptions<TFrontmatter> = {},
  ): readonly ContentNode<TFrontmatter>[] {
    const canUseIndex =
      options.useIndex !== false &&
      value !== undefined &&
      value !== null &&
      options.deep !== false &&
      this.#byKey.has(key);

    if (this.isBlankPathValue(key, value)) {
      return freezeArray([]);
    }

    const keyIndex = this.#byKey.get(key);
    const normalizedValue =
      typeof value === 'string' && this.isPathKey(key) && keyIndex?.has(value)
        ? value
        : this.normalizeIndexValue(key, value);

    if (canUseIndex) {
      const indexedItems = keyIndex?.get(normalizedValue) ?? [];
      const scopedItems = this.filterByScope(indexedItems, options);
      return this.sortResult(scopedItems, options.sort);
    }

    return this.find(
      (node) =>
        node.data
          ? this.matchesField(
              node as ContentNodeImpl<TFrontmatter>,
              key,
              normalizedValue,
            )
          : false,
      {
        ...options,
        useIndex: false,
      },
    );
  }

  public firstBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options: FindOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    return this.findBy(key, value, options)[0] ?? null;
  }

  private prepareItems(
    items: readonly TFrontmatter[],
  ): PreparedContentItem<TFrontmatter>[] {
    const preparedItems: PreparedContentItem<TFrontmatter>[] = [];
    const pathIndexes = new Map<string, number>();

    items.forEach((inputItem) => {
      const publicUrl = readOptionalStringProperty(inputItem, 'url');
      if (publicUrl === undefined || publicUrl.trim() === '') {
        throw new MissingContentPathError('', 'url');
      }
      readOptionalStringProperty(inputItem, 'rawUrl');
      readOptionalBooleanProperty(inputItem, 'draft');
      readOptionalStringProperty(inputItem, this.#options.sourcePathKey);
      const semanticOverrides = new Map<string | symbol, unknown>();
      for (const key of new Set<string>([
        this.#options.pathKey,
        this.#options.sourcePathKey,
        'url',
        'rawUrl',
        'draft',
      ])) {
        const value = readOwnDataProperty(inputItem, key);
        if (value !== undefined) {
          semanticOverrides.set(key, value);
        }
      }
      const item = createContentSnapshotWithOverrides(
        inputItem,
        semanticOverrides,
      );

      if (
        !this.#options.includeDrafts &&
        getSnapshotField(item, 'draft') === true
      ) {
        return;
      }

      const pathValue = getSnapshotField(item, this.#options.pathKey);

      if (typeof pathValue !== 'string' || pathValue.trim() === '') {
        throw new MissingContentPathError('', this.#options.pathKey);
      }

      const path = this.#options.normalizePath(pathValue);
      const existingIndex = pathIndexes.get(path);

      if (existingIndex !== undefined) {
        if (this.#options.duplicatePath === 'error') {
          throw new DuplicateContentPathError(path);
        }

        if (this.#options.duplicatePath === 'first-wins') {
          return;
        }

        preparedItems.splice(existingIndex, 1);
        pathIndexes.clear();
        preparedItems.forEach((entry, index) =>
          pathIndexes.set(entry.path, index),
        );
      }

      pathIndexes.set(path, preparedItems.length);
      preparedItems.push({ item, path });
    });

    return preparedItems;
  }

  private insertItem(item: DeepReadonly<TFrontmatter>, path: string): void {
    if (path === '/') {
      this.root.setData(item, path, CONTENT_TREE_MUTATION_TOKEN);
      this.#byPath.set(path, this.root);
      return;
    }

    const segments = splitNormalizedContentPath(path);
    let currentNode = this.root;

    segments.forEach((segment, index) => {
      const existingChild = currentNode.childBySegment(segment);
      const childUrl = joinContentPath(currentNode.url, segment);
      const child =
        existingChild ??
        new ContentNodeImpl<TFrontmatter>(
          {
            url: childUrl,
            segment,
            parent: currentNode,
            tree: this,
            virtual: true,
          },
          CONTENT_TREE_MUTATION_TOKEN,
        );

      if (!existingChild) {
        currentNode.addChild(child, CONTENT_TREE_MUTATION_TOKEN);
        this.#byPath.set(childUrl, child);
      }

      if (index === segments.length - 1) {
        child.setData(item, path, CONTENT_TREE_MUTATION_TOKEN);
        this.#byPath.set(path, child);
      }

      currentNode = child;
    });
  }

  private indexTree(): void {
    this.#allNodes = freezeArray([
      this.root,
      ...(this.root.descendants({
        includeVirtual: true,
      }) as readonly ContentNodeImpl<TFrontmatter>[]),
    ]);

    this.#allNodes.forEach((node) => {
      this.#ownedNodes.add(node);
      this.#byPath.set(node.url, node);

      const data = node.data;
      if (!data) {
        return;
      }

      const normalizedPathValues = this.getNormalizedPathValues(node);
      this.#normalizedPathValuesByNode.set(node, normalizedPathValues);
      const urlKey = 'url' as keyof TFrontmatter;
      const normalizedUrl = normalizedPathValues.get(urlKey);

      if (typeof normalizedUrl === 'string') {
        this.setUniquePathIndex(this.#byUrl, normalizedUrl, node, 'url');
      }

      const sourcePath = normalizedPathValues.get(this.#options.sourcePathKey);

      if (typeof sourcePath === 'string' && sourcePath.trim() !== '') {
        this.setUniquePathIndex(
          this.#bySourcePath,
          sourcePath,
          node,
          this.#options.sourcePathKey,
        );
      }

      this.#options.indexKeys.forEach((key) => {
        this.getIndexValues(data, key, normalizedPathValues).forEach(
          (indexValue) => {
            this.addGenericIndex(key, indexValue, node);
          },
        );
      });
    });
  }

  private setUniquePathIndex(
    index: Map<string, ContentNodeImpl<TFrontmatter>>,
    key: string,
    node: ContentNodeImpl<TFrontmatter>,
    label: string,
  ): void {
    const existing = index.get(key);

    if (existing && existing !== node) {
      if (this.#options.duplicatePath === 'error') {
        throw new DuplicateContentPathError(
          key,
          label === 'url' ? 'url' : 'source',
        );
      }

      if (this.#options.duplicatePath === 'first-wins') {
        return;
      }
    }

    index.set(key, node);
  }

  private addGenericIndex(
    key: keyof TFrontmatter,
    value: unknown,
    node: ContentNodeImpl<TFrontmatter>,
  ): void {
    let keyIndex = this.#byKey.get(key);

    if (!keyIndex) {
      keyIndex = new Map<unknown, ContentNodeImpl<TFrontmatter>[]>();
      this.#byKey.set(key, keyIndex);
    }

    const bucket = keyIndex.get(value) ?? [];

    if (!bucket.includes(node)) {
      bucket.push(node);
      keyIndex.set(value, bucket);
    }
  }

  private getIndexValues(
    data: DeepReadonly<TFrontmatter>,
    key: keyof TFrontmatter,
    normalizedPathValues: ReadonlyMap<keyof TFrontmatter, string>,
  ): unknown[] {
    const rawValue = getSnapshotField(data, key);

    if (rawValue === undefined || rawValue === null) {
      return [];
    }

    if (Array.isArray(rawValue)) {
      return rawValue.flatMap((item) => {
        if (this.isBlankPathValue(key, item)) {
          return [];
        }

        const normalized = this.normalizeIndexValue(key, item);
        this.assertIndexableValue(key, normalized);
        return [normalized];
      });
    }

    if (this.isBlankPathValue(key, rawValue)) {
      return [];
    }

    const value = normalizedPathValues.get(key) ?? rawValue;
    this.assertIndexableValue(key, value);
    return [value];
  }

  private getNormalizedPathValues(
    node: ContentNodeImpl<TFrontmatter>,
  ): ReadonlyMap<keyof TFrontmatter, string> {
    const data = node.data;
    const values = new Map<keyof TFrontmatter, string>();

    if (!data) {
      return values;
    }

    values.set(this.#options.pathKey, node.url);
    (
      [
        this.#options.sourcePathKey,
        'url' as keyof TFrontmatter,
        'rawUrl' as keyof TFrontmatter,
      ] as const
    ).forEach((key) => {
      if (values.has(key)) {
        return;
      }

      const rawValue = getSnapshotField(data, key);
      if (typeof rawValue === 'string' && rawValue.trim() !== '') {
        values.set(key, this.#options.normalizePath(rawValue));
      }
    });

    return values;
  }

  private normalizeIndexValue(
    key: keyof TFrontmatter,
    value: unknown,
  ): unknown {
    if (typeof value !== 'string' || !this.isPathKey(key)) {
      return value;
    }

    return this.#options.normalizePath(value);
  }

  private isPathKey(key: keyof TFrontmatter): boolean {
    return (
      key === this.#options.pathKey ||
      key === this.#options.sourcePathKey ||
      String(key) === 'url' ||
      String(key) === 'rawUrl'
    );
  }

  private matchesField(
    node: ContentNodeImpl<TFrontmatter>,
    key: keyof TFrontmatter,
    normalizedValue: unknown,
  ): boolean {
    const data = node.data;
    if (!data) {
      return false;
    }
    const cachedPathValue = this.#normalizedPathValuesByNode
      .get(node)
      ?.get(key);
    if (cachedPathValue !== undefined) {
      return sameValueZero(cachedPathValue, normalizedValue);
    }
    const fieldValue = getSnapshotField(data, key);

    if (Array.isArray(fieldValue)) {
      return fieldValue
        .filter((item) => !this.isBlankPathValue(key, item))
        .map((item) => this.normalizeIndexValue(key, item))
        .includes(normalizedValue);
    }

    if (this.isBlankPathValue(key, fieldValue)) {
      return false;
    }

    return sameValueZero(
      this.normalizeIndexValue(key, fieldValue),
      normalizedValue,
    );
  }

  private assertIndexableValue(key: keyof TFrontmatter, value: unknown): void {
    if (
      (typeof value === 'object' && value !== null) ||
      typeof value === 'function'
    ) {
      throw new TypeError(
        `Content index field ${String(key)} must contain only primitive values.`,
      );
    }
  }

  private isBlankPathValue(key: keyof TFrontmatter, value: unknown): boolean {
    return (
      this.isPathKey(key) && typeof value === 'string' && value.trim() === ''
    );
  }

  private getSearchSpace(
    options: FindOptions<TFrontmatter> = {},
  ): readonly ContentNodeImpl<TFrontmatter>[] {
    const underNode = this.resolveUnder(options.under);

    if (!underNode) {
      return freezeArray([]);
    }

    const includeVirtual = options.includeVirtual === true;
    const includeSelf = options.includeSelf === true;

    if (options.deep === false) {
      return freezeArray([
        ...(includeSelf && (includeVirtual || !underNode.virtual)
          ? [underNode]
          : []),
        ...(underNode.children({
          includeVirtual,
        }) as readonly ContentNodeImpl<TFrontmatter>[]),
      ]);
    }

    return underNode.descendants({
      includeVirtual,
      includeSelf,
    }) as readonly ContentNodeImpl<TFrontmatter>[];
  }

  private resolveUnder(
    under?: string | ContentNode<TFrontmatter>,
  ): ContentNodeImpl<TFrontmatter> | null {
    if (!under) {
      return this.root;
    }

    if (typeof under === 'string') {
      return this.get(under) as ContentNodeImpl<TFrontmatter> | null;
    }

    if (!(under instanceof ContentNodeImpl)) {
      return null;
    }

    const node = under as ContentNodeImpl<TFrontmatter>;
    return this.#ownedNodes.has(node) ? node : null;
  }

  private filterByScope(
    nodes: readonly ContentNodeImpl<TFrontmatter>[],
    options: FindOptions<TFrontmatter>,
  ): readonly ContentNodeImpl<TFrontmatter>[] {
    const underNode = this.resolveUnder(options.under);

    if (!underNode) {
      return freezeArray([]);
    }

    if (!options.under) {
      return freezeArray(
        options.includeSelf === true
          ? [...nodes]
          : nodes.filter((node) => node !== this.root),
      );
    }

    const includeSelf = options.includeSelf === true;

    return freezeArray(
      nodes.filter((node) => {
        if (node === underNode) {
          return includeSelf;
        }

        let parent = node.rawParent();

        while (parent) {
          if (parent === underNode) {
            return true;
          }

          parent = parent.rawParent();
        }

        return false;
      }),
    );
  }

  private sortResult(
    nodes: readonly ContentNode<TFrontmatter>[],
    sort?: (
      a: ContentNode<TFrontmatter>,
      b: ContentNode<TFrontmatter>,
    ) => number,
  ): readonly ContentNode<TFrontmatter>[] {
    return freezeArray(sort ? [...nodes].sort(sort) : nodes);
  }
}

Object.freeze(ContentNodeImpl.prototype);
Object.freeze(ContentTreeImpl.prototype);
Object.freeze(ContentNodeImpl);
Object.freeze(ContentTreeImpl);

/**
 * Create a detached, deeply immutable tree and indexes from content records.
 *
 * @public
 */
export function createContentTree<TFrontmatter extends ContentRecord>(
  items: readonly TFrontmatter[],
  options?: ContentTreeOptions<TFrontmatter>,
): ContentTree<TFrontmatter> {
  return new ContentTreeImpl(items, options);
}
