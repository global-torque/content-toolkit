const DEFAULT_INDEX_KEYS = [
    'url',
    'rawUrl',
    'slug',
    'layout',
    'tags',
];
export function normalizeContentPath(path) {
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
export function splitContentPath(path, normalizePath = normalizeContentPath) {
    const normalized = normalizePath(path);
    return normalized === '/' ? [] : normalized.slice(1).split('/');
}
function getUrlSegment(url) {
    const segments = splitContentPath(url);
    return segments[segments.length - 1] || '';
}
function joinContentPath(parentUrl, segment) {
    return parentUrl === '/' ? `/${segment}` : `${parentUrl}/${segment}`;
}
function uniqueKeys(keys) {
    return [...new Set(keys.filter((key) => key !== undefined))];
}
function resolveOptions(options = {}) {
    const pathKey = options.pathKey ?? 'url';
    const sourcePathKey = options.sourcePathKey ?? 'rawUrl';
    const indexKeys = uniqueKeys([
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
function toDirectSegment(segment) {
    return segment.replace(/^\/+|\/+$/g, '');
}
function freezeArray(items) {
    return Object.freeze(items);
}
class ContentNodeImpl {
    kind;
    url;
    segment;
    data;
    virtual;
    childrenBySegment = new Map();
    parentNode;
    tree;
    cachedChildrenWithVirtual = null;
    cachedChildrenWithoutVirtual = null;
    cachedDescendantsWithVirtual = null;
    cachedDescendantsWithoutVirtual = null;
    constructor(options) {
        this.data = options.data;
        this.virtual = options.virtual ?? options.data === undefined;
        this.kind = this.virtual ? 'virtual' : 'page';
        this.url = options.url;
        this.segment = options.segment;
        this.parentNode = options.parent;
        this.tree = options.tree;
    }
    parent(options = {}) {
        const skipVirtual = options.skipVirtual ?? true;
        let currentParent = this.parentNode;
        while (skipVirtual && currentParent?.virtual) {
            currentParent = currentParent.parentNode;
        }
        return currentParent;
    }
    child(segment, options = {}) {
        const child = this.childrenBySegment.get(toDirectSegment(segment)) ?? null;
        if (child?.virtual && options.includeVirtual !== true) {
            return null;
        }
        return child;
    }
    children(options = {}) {
        return this.getChildren(options);
    }
    descendants(options = {}) {
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
            }
            else {
                this.cachedDescendantsWithoutVirtual = descendants;
            }
        }
        const result = [
            ...(includeSelf && (includeVirtual || !this.virtual) ? [this] : []),
            ...descendants,
        ];
        return hasCustomSort ? result.sort(options.sort) : result;
    }
    siblings(options = {}) {
        if (!this.parentNode) {
            return [];
        }
        return this.parentNode
            .children(options)
            .filter((sibling) => sibling !== this);
    }
    next(options = {}) {
        return this.getSiblingByOffset(1, options);
    }
    previous(options = {}) {
        return this.getSiblingByOffset(-1, options);
    }
    find(predicate, options = {}) {
        return this.tree.find(predicate, {
            ...options,
            under: options.under ?? this,
        });
    }
    findBy(key, value, options = {}) {
        return this.tree.findBy(key, value, {
            ...options,
            under: options.under ?? this,
        });
    }
    firstBy(key, value, options = {}) {
        return this.findBy(key, value, options)[0] ?? null;
    }
    hasChildren(options = {}) {
        return this.children(options).length > 0;
    }
    addChild(child) {
        this.childrenBySegment.set(child.segment, child);
        this.clearCaches();
    }
    childBySegment(segment) {
        return this.childrenBySegment.get(segment);
    }
    rawParent() {
        return this.parentNode;
    }
    setData(data, url) {
        this.data = data;
        this.url = url;
        this.segment = getUrlSegment(url);
        this.virtual = false;
        this.kind = 'page';
        this.clearCaches();
    }
    sortDeep(sortSiblings) {
        if (sortSiblings) {
            this.childrenBySegment = new Map([...this.childrenBySegment.entries()]
                .sort(([, a], [, b]) => sortSiblings(a, b)));
        }
        this.clearCaches();
        this.childrenBySegment.forEach((child) => child.sortDeep(sortSiblings));
    }
    finalizeDeep() {
        this.childrenBySegment.forEach((child) => child.finalizeDeep());
        this.lockPublicFields();
    }
    getChildren(options = {}) {
        const includeVirtual = options.includeVirtual === true;
        const hasCustomSort = typeof options.sort === 'function';
        let children = includeVirtual
            ? this.cachedChildrenWithVirtual
            : this.cachedChildrenWithoutVirtual;
        if (!children) {
            const values = [...this.childrenBySegment.values()];
            children = freezeArray(includeVirtual ? values : values.filter((child) => !child.virtual));
            if (includeVirtual) {
                this.cachedChildrenWithVirtual = children;
            }
            else {
                this.cachedChildrenWithoutVirtual = children;
            }
        }
        return hasCustomSort ? [...children].sort(options.sort) : children;
    }
    collectDescendants(includeVirtual) {
        const descendants = [];
        this.childrenBySegment.forEach((child) => {
            if (includeVirtual || !child.virtual) {
                descendants.push(child);
            }
            descendants.push(...child.collectDescendants(includeVirtual));
        });
        return freezeArray(descendants);
    }
    getSiblingByOffset(offset, options = {}) {
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
    clearCaches() {
        this.cachedChildrenWithVirtual = null;
        this.cachedChildrenWithoutVirtual = null;
        this.cachedDescendantsWithVirtual = null;
        this.cachedDescendantsWithoutVirtual = null;
    }
    lockPublicFields() {
        [
            'kind',
            'url',
            'segment',
            'data',
            'virtual',
        ].forEach((key) => {
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
class ContentTreeImpl {
    root;
    items;
    wrapSiblings;
    options;
    byPath = new Map();
    byUrl = new Map();
    bySourcePath = new Map();
    byKey = new Map();
    allNodes = [];
    constructor(items, options = {}) {
        this.options = resolveOptions(options);
        this.wrapSiblings = this.options.wrapSiblings;
        this.root = new ContentNodeImpl({
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
    getByUrl(url) {
        return this.byUrl.get(this.options.normalizePath(url)) ?? null;
    }
    getBySourcePath(path) {
        return this.bySourcePath.get(this.options.normalizePath(path)) ?? null;
    }
    get(path) {
        return this.byPath.get(this.options.normalizePath(path)) ?? null;
    }
    children(path, options = {}) {
        return this.get(path)?.children(options) ?? [];
    }
    descendants(path, options = {}) {
        return this.get(path)?.descendants(options) ?? [];
    }
    parent(path, options = {}) {
        return this.get(path)?.parent(options) ?? null;
    }
    next(path, options = {}) {
        return this.get(path)?.next(options) ?? null;
    }
    previous(path, options = {}) {
        return this.get(path)?.previous(options) ?? null;
    }
    find(predicate, options = {}) {
        const result = this.getSearchSpace(options).filter(predicate);
        return this.sortResult(result, options.sort);
    }
    findBy(key, value, options = {}) {
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
        return this.find((node) => (node.data ? this.matchesField(node.data, key, value) : false), {
            ...options,
            useIndex: false,
        });
    }
    firstBy(key, value, options = {}) {
        return this.findBy(key, value, options)[0] ?? null;
    }
    prepareItems(items) {
        const preparedItems = [];
        const pathIndexes = new Map();
        items.forEach((item) => {
            if (!this.options.includeDrafts && item.draft === true) {
                return;
            }
            const pathValue = item[this.options.pathKey];
            if (typeof pathValue !== 'string' || pathValue.trim() === '') {
                throw new Error(`Content item is missing a string "${String(this.options.pathKey)}" path.`);
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
    insertItem(item, path) {
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
            const child = existingChild ?? new ContentNodeImpl({
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
    indexTree() {
        this.allNodes = freezeArray([
            this.root,
            ...this.root.descendants({ includeVirtual: true }),
        ]);
        this.allNodes.forEach((node) => {
            this.byPath.set(node.url, node);
            if (!node.data) {
                return;
            }
            this.setUniquePathIndex(this.byUrl, this.options.normalizePath(node.data.url), node, 'url');
            const sourcePath = node.data[this.options.sourcePathKey];
            if (typeof sourcePath === 'string' && sourcePath.trim() !== '') {
                this.setUniquePathIndex(this.bySourcePath, this.options.normalizePath(sourcePath), node, String(this.options.sourcePathKey));
            }
            this.options.indexKeys.forEach((key) => {
                this.getIndexValues(node.data, key).forEach((indexValue) => {
                    this.addGenericIndex(key, indexValue, node);
                });
            });
        });
    }
    setUniquePathIndex(index, key, node, label) {
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
    addGenericIndex(key, value, node) {
        let keyIndex = this.byKey.get(key);
        if (!keyIndex) {
            keyIndex = new Map();
            this.byKey.set(key, keyIndex);
        }
        const bucket = keyIndex.get(value) ?? [];
        if (!bucket.includes(node)) {
            bucket.push(node);
            keyIndex.set(value, bucket);
        }
    }
    getIndexValues(data, key) {
        const rawValue = data[key];
        if (rawValue === undefined || rawValue === null) {
            return [];
        }
        if (Array.isArray(rawValue)) {
            return rawValue.map((item) => this.normalizeIndexValue(key, item));
        }
        return [this.normalizeIndexValue(key, rawValue)];
    }
    normalizeIndexValue(key, value) {
        if (typeof value !== 'string' || !this.isPathKey(key)) {
            return value;
        }
        return this.options.normalizePath(value);
    }
    isPathKey(key) {
        return key === this.options.pathKey
            || key === this.options.sourcePathKey
            || String(key) === 'url'
            || String(key) === 'rawUrl';
    }
    matchesField(data, key, value) {
        const fieldValue = data[key];
        const normalizedValue = this.normalizeIndexValue(key, value);
        if (Array.isArray(fieldValue)) {
            return fieldValue
                .map((item) => this.normalizeIndexValue(key, item))
                .includes(normalizedValue);
        }
        return this.normalizeIndexValue(key, fieldValue) === normalizedValue;
    }
    getSearchSpace(options = {}) {
        const underNode = this.resolveUnder(options.under);
        if (!underNode) {
            return [];
        }
        const includeVirtual = options.includeVirtual === true;
        const includeSelf = options.includeSelf === true;
        if (options.deep === false) {
            return [
                ...(includeSelf && (includeVirtual || !underNode.virtual) ? [underNode] : []),
                ...underNode.children({ includeVirtual }),
            ];
        }
        return underNode.descendants({
            includeVirtual,
            includeSelf,
        });
    }
    resolveUnder(under) {
        if (!under) {
            return this.root;
        }
        if (typeof under === 'string') {
            return this.get(under);
        }
        return under;
    }
    filterByScope(nodes, options) {
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
    sortResult(nodes, sort) {
        return sort ? [...nodes].sort(sort) : nodes;
    }
}
export function createContentTree(items, options) {
    return new ContentTreeImpl(items, options);
}
//# sourceMappingURL=pages.js.map