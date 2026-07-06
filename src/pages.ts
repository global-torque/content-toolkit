import type { BaseFrontmatter } from './types.ts';

export type { BaseFrontmatter } from './types.ts';

export type ContentPathKey<TFrontmatter> = Extract<keyof TFrontmatter, string>;
export type ContentNodeKind = 'page' | 'virtual';
export type ContentNodePredicate<TFrontmatter extends BaseFrontmatter> = (
  node: ContentNode<TFrontmatter>
) => boolean;
export type ContentFieldValue<
  TFrontmatter,
  TKey extends keyof TFrontmatter,
> = NonNullable<TFrontmatter[TKey]> extends readonly (infer TItem)[]
  ? TItem
  : TFrontmatter[TKey];

export interface ParentOptions {
  skipVirtual?: boolean;
}

export interface ChildOptions {
  includeVirtual?: boolean;
}

export interface ChildrenOptions<TFrontmatter extends BaseFrontmatter> {
  includeVirtual?: boolean;
  sort?: (
    a: ContentNode<TFrontmatter>,
    b: ContentNode<TFrontmatter>
  ) => number;
}

export interface DescendantsOptions<TFrontmatter extends BaseFrontmatter>
  extends ChildrenOptions<TFrontmatter> {
  includeSelf?: boolean;
}

export interface SiblingOptions<TFrontmatter extends BaseFrontmatter>
  extends ChildrenOptions<TFrontmatter> {
  wrap?: boolean;
}

export interface FindOptions<TFrontmatter extends BaseFrontmatter>
  extends DescendantsOptions<TFrontmatter> {
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
  sortSiblings?: (
    a: ContentNode<TFrontmatter>,
    b: ContentNode<TFrontmatter>
  ) => number;
  wrapSiblings?: boolean;
}

export interface ContentNode<TFrontmatter extends BaseFrontmatter> {
  readonly kind: ContentNodeKind;
  readonly url: string;
  readonly segment: string;
  readonly data: TFrontmatter | undefined;
  readonly virtual: boolean;

  parent(options?: ParentOptions): ContentNode<TFrontmatter> | null;
  child(
    segment: string,
    options?: ChildOptions
  ): ContentNode<TFrontmatter> | null;
  children(options?: ChildrenOptions<TFrontmatter>): ContentNode<TFrontmatter>[];
  descendants(
    options?: DescendantsOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  siblings(
    options?: SiblingOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  next(options?: SiblingOptions<TFrontmatter>): ContentNode<TFrontmatter> | null;
  previous(
    options?: SiblingOptions<TFrontmatter>
  ): ContentNode<TFrontmatter> | null;
  find(
    predicate: ContentNodePredicate<TFrontmatter>,
    options?: FindOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: FindOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  firstBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: FindOptions<TFrontmatter>
  ): ContentNode<TFrontmatter> | null;
  hasChildren(options?: ChildrenOptions<TFrontmatter>): boolean;
}

export interface ContentTree<TFrontmatter extends BaseFrontmatter> {
  readonly root: ContentNode<TFrontmatter>;
  readonly items: readonly TFrontmatter[];

  getByUrl(url: string): ContentNode<TFrontmatter> | null;
  getBySourcePath(path: string): ContentNode<TFrontmatter> | null;
  get(path: string): ContentNode<TFrontmatter> | null;
  children(
    path: string,
    options?: ChildrenOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  descendants(
    path: string,
    options?: DescendantsOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  parent(path: string, options?: ParentOptions): ContentNode<TFrontmatter> | null;
  next(
    path: string,
    options?: SiblingOptions<TFrontmatter>
  ): ContentNode<TFrontmatter> | null;
  previous(
    path: string,
    options?: SiblingOptions<TFrontmatter>
  ): ContentNode<TFrontmatter> | null;
  find(
    predicate: ContentNodePredicate<TFrontmatter>,
    options?: FindOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: FindOptions<TFrontmatter>
  ): ContentNode<TFrontmatter>[];
  firstBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options?: FindOptions<TFrontmatter>
  ): ContentNode<TFrontmatter> | null;
}

interface ResolvedContentTreeOptions<TFrontmatter extends BaseFrontmatter> {
  pathKey: ContentPathKey<TFrontmatter>;
  sourcePathKey: ContentPathKey<TFrontmatter>;
  indexKeys: readonly (keyof TFrontmatter)[];
  includeDrafts: boolean;
  duplicateUrl: 'error' | 'first-wins' | 'last-wins';
  normalizePath: (path: string) => string;
  sortSiblings?: (
    a: ContentNode<TFrontmatter>,
    b: ContentNode<TFrontmatter>
  ) => number;
  wrapSiblings: boolean;
}

interface PreparedContentItem<TFrontmatter extends BaseFrontmatter> {
  item: TFrontmatter;
  path: string;
}

interface ContentNodeConstructorOptions<TFrontmatter extends BaseFrontmatter> {
  url: string;
  segment: string;
  parent: ContentNodeImpl<TFrontmatter> | null;
  tree: ContentTreeImpl<TFrontmatter>;
  data?: TFrontmatter;
  virtual?: boolean;
}

const DEFAULT_INDEX_KEYS = [
  'url',
  'rawUrl',
  'slug',
  'layout',
  'tags',
] as const;

export function normalizeContentPath(path: string): string {
  const [withoutQuery] = path.trim().split(/[?#]/);
  let normalized = withoutQuery || '/';

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/\/{2,}/g, '/');

  if (normalized.length > 1) {
    normalized = normalized.replace(/\/+$/, '');
  }

  return normalized || '/';
}

export function splitContentPath(
  path: string,
  normalizePath: (value: string) => string = normalizeContentPath,
): string[] {
  const normalized = normalizePath(path);
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

function getUrlSegment(url: string): string {
  const segments = splitContentPath(url);
  return segments[segments.length - 1] || '';
}

function joinContentPath(parentUrl: string, segment: string): string {
  return parentUrl === '/' ? `/${segment}` : `${parentUrl}/${segment}`;
}

function uniqueKeys<TFrontmatter extends BaseFrontmatter>(
  keys: readonly (keyof TFrontmatter | undefined)[]
): readonly (keyof TFrontmatter)[] {
  return [...new Set(keys.filter((key): key is keyof TFrontmatter => key !== undefined))];
}

function resolveOptions<TFrontmatter extends BaseFrontmatter>(
  options: ContentTreeOptions<TFrontmatter> = {},
): ResolvedContentTreeOptions<TFrontmatter> {
  const pathKey = options.pathKey ?? ('url' as ContentPathKey<TFrontmatter>);
  const sourcePathKey = options.sourcePathKey ?? ('rawUrl' as ContentPathKey<TFrontmatter>);
  const indexKeys = uniqueKeys<TFrontmatter>([
    pathKey,
    sourcePathKey,
    ...(options.indexKeys ?? DEFAULT_INDEX_KEYS),
  ]);

  return {
    pathKey,
    sourcePathKey,
    indexKeys,
    includeDrafts: options.includeDrafts ?? false,
    duplicateUrl: options.duplicateUrl ?? 'error',
    normalizePath: options.normalizePath ?? normalizeContentPath,
    sortSiblings: options.sortSiblings,
    wrapSiblings: options.wrapSiblings ?? true,
  };
}

function toDirectSegment(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

function freezeArray<T>(items: T[]): T[] {
  return Object.freeze(items) as T[];
}

class ContentNodeImpl<TFrontmatter extends BaseFrontmatter>
implements ContentNode<TFrontmatter> {
  public kind: ContentNodeKind;

  public url: string;

  public segment: string;

  public data: TFrontmatter | undefined;

  public virtual: boolean;

  private childrenBySegment = new Map<string, ContentNodeImpl<TFrontmatter>>();

  private parentNode: ContentNodeImpl<TFrontmatter> | null;

  private readonly tree: ContentTreeImpl<TFrontmatter>;

  private cachedChildrenWithVirtual: ContentNodeImpl<TFrontmatter>[] | null = null;

  private cachedChildrenWithoutVirtual: ContentNodeImpl<TFrontmatter>[] | null = null;

  private cachedDescendantsWithVirtual: ContentNodeImpl<TFrontmatter>[] | null = null;

  private cachedDescendantsWithoutVirtual: ContentNodeImpl<TFrontmatter>[] | null = null;

  public constructor(options: ContentNodeConstructorOptions<TFrontmatter>) {
    this.data = options.data;
    this.virtual = options.virtual ?? options.data === undefined;
    this.kind = this.virtual ? 'virtual' : 'page';
    this.url = options.url;
    this.segment = options.segment;
    this.parentNode = options.parent;
    this.tree = options.tree;
  }

  public parent(options: ParentOptions = {}): ContentNode<TFrontmatter> | null {
    const skipVirtual = options.skipVirtual ?? true;
    let currentParent = this.parentNode;

    while (skipVirtual && currentParent?.virtual) {
      currentParent = currentParent.parentNode;
    }

    return currentParent;
  }

  public child(
    segment: string,
    options: ChildOptions = {},
  ): ContentNode<TFrontmatter> | null {
    const child = this.childrenBySegment.get(toDirectSegment(segment)) ?? null;

    if (child?.virtual && options.includeVirtual !== true) {
      return null;
    }

    return child;
  }

  public children(
    options: ChildrenOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    return this.getChildren(options);
  }

  public descendants(
    options: DescendantsOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    const includeVirtual = options.includeVirtual === true;
    const includeSelf = options.includeSelf === true;
    const hasCustomSort = typeof options.sort === 'function';
    let descendants = includeVirtual
      ? this.cachedDescendantsWithVirtual
      : this.cachedDescendantsWithoutVirtual;

    if (!descendants) {
      descendants = this.collectDescendants(includeVirtual);

      if (includeVirtual) {
        this.cachedDescendantsWithVirtual = descendants;
      } else {
        this.cachedDescendantsWithoutVirtual = descendants;
      }
    }

    const result = [
      ...(includeSelf && (includeVirtual || !this.virtual) ? [this] : []),
      ...descendants,
    ];

    return hasCustomSort ? result.sort(options.sort) : result;
  }

  public siblings(
    options: SiblingOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    if (!this.parentNode) {
      return [];
    }

    return this.parentNode
      .children(options)
      .filter((sibling) => sibling !== this);
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
    options: FindOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    return this.tree.find(predicate, {
      ...options,
      under: options.under ?? this,
    });
  }

  public findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options: FindOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    return this.tree.findBy(key, value, {
      ...options,
      under: options.under ?? this,
    });
  }

  public firstBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options: FindOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter> | null {
    return this.findBy(key, value, options)[0] ?? null;
  }

  public hasChildren(options: ChildrenOptions<TFrontmatter> = {}): boolean {
    return this.children(options).length > 0;
  }

  public addChild(child: ContentNodeImpl<TFrontmatter>): void {
    this.childrenBySegment.set(child.segment, child);
    this.clearCaches();
  }

  public childBySegment(segment: string): ContentNodeImpl<TFrontmatter> | undefined {
    return this.childrenBySegment.get(segment);
  }

  public rawParent(): ContentNodeImpl<TFrontmatter> | null {
    return this.parentNode;
  }

  public setData(data: TFrontmatter, url: string): void {
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
      b: ContentNode<TFrontmatter>
    ) => number,
  ): void {
    if (sortSiblings) {
      this.childrenBySegment = new Map(
        [...this.childrenBySegment.entries()]
          .sort(([, a], [, b]) => sortSiblings(a, b)),
      );
    }

    this.clearCaches();
    this.childrenBySegment.forEach((child) => child.sortDeep(sortSiblings));
  }

  public finalizeDeep(): void {
    this.childrenBySegment.forEach((child) => child.finalizeDeep());
    this.lockPublicFields();
  }

  private getChildren(
    options: ChildrenOptions<TFrontmatter> = {},
  ): ContentNodeImpl<TFrontmatter>[] {
    const includeVirtual = options.includeVirtual === true;
    const hasCustomSort = typeof options.sort === 'function';
    let children = includeVirtual
      ? this.cachedChildrenWithVirtual
      : this.cachedChildrenWithoutVirtual;

    if (!children) {
      const values = [...this.childrenBySegment.values()];
      children = freezeArray(
        includeVirtual ? values : values.filter((child) => !child.virtual),
      );

      if (includeVirtual) {
        this.cachedChildrenWithVirtual = children;
      } else {
        this.cachedChildrenWithoutVirtual = children;
      }
    }

    return hasCustomSort ? [...children].sort(options.sort) : children;
  }

  private collectDescendants(
    includeVirtual: boolean,
  ): ContentNodeImpl<TFrontmatter>[] {
    const descendants: ContentNodeImpl<TFrontmatter>[] = [];

    this.childrenBySegment.forEach((child) => {
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
    if (!this.parentNode) {
      return null;
    }

    const siblings = this.parentNode.children(options);
    const index = siblings.findIndex((sibling) => sibling === this);

    if (index === -1 || siblings.length === 0) {
      return null;
    }

    const nextIndex = index + offset;

    if (nextIndex >= 0 && nextIndex < siblings.length) {
      return siblings[nextIndex];
    }

    const shouldWrap = options.wrap ?? this.tree.wrapSiblings;

    if (!shouldWrap) {
      return null;
    }

    return offset === 1 ? siblings[0] : siblings[siblings.length - 1];
  }

  private clearCaches(): void {
    this.cachedChildrenWithVirtual = null;
    this.cachedChildrenWithoutVirtual = null;
    this.cachedDescendantsWithVirtual = null;
    this.cachedDescendantsWithoutVirtual = null;
  }

  private lockPublicFields(): void {
    ([
      'kind',
      'url',
      'segment',
      'data',
      'virtual',
    ] as const).forEach((key) => {
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

class ContentTreeImpl<TFrontmatter extends BaseFrontmatter>
implements ContentTree<TFrontmatter> {
  public readonly root: ContentNodeImpl<TFrontmatter>;

  public readonly items: readonly TFrontmatter[];

  public readonly wrapSiblings: boolean;

  private readonly options: ResolvedContentTreeOptions<TFrontmatter>;

  private readonly byPath = new Map<string, ContentNodeImpl<TFrontmatter>>();

  private readonly byUrl = new Map<string, ContentNodeImpl<TFrontmatter>>();

  private readonly bySourcePath = new Map<string, ContentNodeImpl<TFrontmatter>>();

  private readonly byKey = new Map<
    keyof TFrontmatter,
    Map<unknown, ContentNodeImpl<TFrontmatter>[]>
  >();

  private allNodes: readonly ContentNodeImpl<TFrontmatter>[] = [];

  public constructor(
    items: readonly TFrontmatter[],
    options: ContentTreeOptions<TFrontmatter> = {},
  ) {
    this.options = resolveOptions(options);
    this.wrapSiblings = this.options.wrapSiblings;
    this.root = new ContentNodeImpl<TFrontmatter>({
      url: '/',
      segment: '',
      parent: null,
      tree: this,
      virtual: true,
    });
    this.byPath.set('/', this.root);

    const preparedItems = this.prepareItems(items);
    this.items = freezeArray(preparedItems.map(({ item }) => item));

    preparedItems.forEach(({ item, path }) => {
      this.insertItem(item, path);
    });

    this.root.sortDeep(this.options.sortSiblings);
    this.indexTree();
    this.root.finalizeDeep();
  }

  public getByUrl(url: string): ContentNode<TFrontmatter> | null {
    return this.byUrl.get(this.options.normalizePath(url)) ?? null;
  }

  public getBySourcePath(path: string): ContentNode<TFrontmatter> | null {
    return this.bySourcePath.get(this.options.normalizePath(path)) ?? null;
  }

  public get(path: string): ContentNode<TFrontmatter> | null {
    return this.byPath.get(this.options.normalizePath(path)) ?? null;
  }

  public children(
    path: string,
    options: ChildrenOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    return this.get(path)?.children(options) ?? [];
  }

  public descendants(
    path: string,
    options: DescendantsOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    return this.get(path)?.descendants(options) ?? [];
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
  ): ContentNode<TFrontmatter>[] {
    const result = this.getSearchSpace(options).filter(predicate);
    return this.sortResult(result, options.sort);
  }

  public findBy<TKey extends keyof TFrontmatter>(
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
    options: FindOptions<TFrontmatter> = {},
  ): ContentNode<TFrontmatter>[] {
    const canUseIndex = options.useIndex !== false
      && value !== undefined
      && value !== null
      && options.deep !== false
      && this.byKey.has(key);
    const normalizedValue = this.normalizeIndexValue(key, value);

    if (canUseIndex) {
      const indexedItems = this.byKey.get(key)?.get(normalizedValue) ?? [];
      const scopedItems = this.filterByScope(indexedItems, options);
      return this.sortResult(scopedItems, options.sort);
    }

    return this.find((node) => (
      node.data ? this.matchesField(node.data, key, value) : false
    ), {
      ...options,
      useIndex: false,
    });
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

    items.forEach((item) => {
      if (!this.options.includeDrafts && item.draft === true) {
        return;
      }

      const pathValue = item[this.options.pathKey];

      if (typeof pathValue !== 'string' || pathValue.trim() === '') {
        throw new Error(
          `Content item is missing a string "${String(this.options.pathKey)}" path.`,
        );
      }

      const path = this.options.normalizePath(pathValue);
      const existingIndex = pathIndexes.get(path);

      if (existingIndex !== undefined) {
        if (this.options.duplicateUrl === 'error') {
          throw new Error(`Duplicate normalized content path "${path}".`);
        }

        if (this.options.duplicateUrl === 'first-wins') {
          return;
        }

        preparedItems.splice(existingIndex, 1);
        pathIndexes.clear();
        preparedItems.forEach((entry, index) => pathIndexes.set(entry.path, index));
      }

      pathIndexes.set(path, preparedItems.length);
      preparedItems.push({ item, path });
    });

    return preparedItems;
  }

  private insertItem(item: TFrontmatter, path: string): void {
    if (path === '/') {
      this.root.setData(item, path);
      this.byPath.set(path, this.root);
      return;
    }

    const segments = splitContentPath(path, this.options.normalizePath);
    let currentNode = this.root;

    segments.forEach((segment, index) => {
      const existingChild = currentNode.childBySegment(segment);
      const childUrl = joinContentPath(currentNode.url, segment);
      const child = existingChild ?? new ContentNodeImpl<TFrontmatter>({
        url: childUrl,
        segment,
        parent: currentNode,
        tree: this,
        virtual: true,
      });

      if (!existingChild) {
        currentNode.addChild(child);
        this.byPath.set(childUrl, child);
      }

      if (index === segments.length - 1) {
        child.setData(item, path);
        this.byPath.set(path, child);
      }

      currentNode = child;
    });
  }

  private indexTree(): void {
    this.allNodes = freezeArray([
      this.root,
      ...(this.root.descendants({ includeVirtual: true }) as ContentNodeImpl<TFrontmatter>[]),
    ]);

    this.allNodes.forEach((node) => {
      this.byPath.set(node.url, node);

      if (!node.data) {
        return;
      }

      this.setUniquePathIndex(
        this.byUrl,
        this.options.normalizePath(node.data.url),
        node,
        'url',
      );

      const sourcePath = node.data[this.options.sourcePathKey];

      if (typeof sourcePath === 'string' && sourcePath.trim() !== '') {
        this.setUniquePathIndex(
          this.bySourcePath,
          this.options.normalizePath(sourcePath),
          node,
          String(this.options.sourcePathKey),
        );
      }

      this.options.indexKeys.forEach((key) => {
        this.getIndexValues(node.data as TFrontmatter, key).forEach((indexValue) => {
          this.addGenericIndex(key, indexValue, node);
        });
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
      if (this.options.duplicateUrl === 'error') {
        throw new Error(`Duplicate normalized content ${label} "${key}".`);
      }

      if (this.options.duplicateUrl === 'first-wins') {
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
    let keyIndex = this.byKey.get(key);

    if (!keyIndex) {
      keyIndex = new Map<unknown, ContentNodeImpl<TFrontmatter>[]>();
      this.byKey.set(key, keyIndex);
    }

    const bucket = keyIndex.get(value) ?? [];

    if (!bucket.includes(node)) {
      bucket.push(node);
      keyIndex.set(value, bucket);
    }
  }

  private getIndexValues(
    data: TFrontmatter,
    key: keyof TFrontmatter,
  ): unknown[] {
    const rawValue = data[key];

    if (rawValue === undefined || rawValue === null) {
      return [];
    }

    if (Array.isArray(rawValue)) {
      return rawValue.map((item) => this.normalizeIndexValue(key, item));
    }

    return [this.normalizeIndexValue(key, rawValue)];
  }

  private normalizeIndexValue(key: keyof TFrontmatter, value: unknown): unknown {
    if (typeof value !== 'string' || !this.isPathKey(key)) {
      return value;
    }

    return this.options.normalizePath(value);
  }

  private isPathKey(key: keyof TFrontmatter): boolean {
    return key === this.options.pathKey
      || key === this.options.sourcePathKey
      || String(key) === 'url'
      || String(key) === 'rawUrl';
  }

  private matchesField<TKey extends keyof TFrontmatter>(
    data: TFrontmatter,
    key: TKey,
    value: ContentFieldValue<TFrontmatter, TKey>,
  ): boolean {
    const fieldValue = data[key];
    const normalizedValue = this.normalizeIndexValue(key, value);

    if (Array.isArray(fieldValue)) {
      return fieldValue
        .map((item) => this.normalizeIndexValue(key, item))
        .includes(normalizedValue);
    }

    return this.normalizeIndexValue(key, fieldValue) === normalizedValue;
  }

  private getSearchSpace(
    options: FindOptions<TFrontmatter> = {},
  ): ContentNodeImpl<TFrontmatter>[] {
    const underNode = this.resolveUnder(options.under);

    if (!underNode) {
      return [];
    }

    const includeVirtual = options.includeVirtual === true;
    const includeSelf = options.includeSelf === true;

    if (options.deep === false) {
      return [
        ...(includeSelf && (includeVirtual || !underNode.virtual) ? [underNode] : []),
        ...(underNode.children({ includeVirtual }) as ContentNodeImpl<TFrontmatter>[]),
      ];
    }

    return underNode.descendants({
      includeVirtual,
      includeSelf,
    }) as ContentNodeImpl<TFrontmatter>[];
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

    return under as ContentNodeImpl<TFrontmatter>;
  }

  private filterByScope(
    nodes: ContentNodeImpl<TFrontmatter>[],
    options: FindOptions<TFrontmatter>,
  ): ContentNodeImpl<TFrontmatter>[] {
    const underNode = this.resolveUnder(options.under);

    if (!underNode) {
      return [];
    }

    if (!options.under) {
      return options.includeSelf === true
        ? [...nodes]
        : nodes.filter((node) => node !== this.root);
    }

    const includeSelf = options.includeSelf === true;

    return nodes.filter((node) => {
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
    });
  }

  private sortResult(
    nodes: ContentNode<TFrontmatter>[],
    sort?: (
      a: ContentNode<TFrontmatter>,
      b: ContentNode<TFrontmatter>
    ) => number,
  ): ContentNode<TFrontmatter>[] {
    return sort ? [...nodes].sort(sort) : nodes;
  }
}

export function createContentTree<TFrontmatter extends BaseFrontmatter>(
  items: readonly TFrontmatter[],
  options?: ContentTreeOptions<TFrontmatter>,
): ContentTree<TFrontmatter> {
  return new ContentTreeImpl(items, options);
}
