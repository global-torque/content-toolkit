import { runInNewContext } from 'node:vm';

import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import {
  createContentTree,
  DuplicateContentPathError,
  MissingContentPathError,
  normalizeContentPath,
  splitContentPath,
  type ContentFieldValue,
  type ContentTreeOptions,
} from './pages';
import type { ContentRecord } from './types';

interface TestRecord extends ContentRecord {
  title?: string;
  slug?: string;
  layout?: string;
  tags?: readonly string[];
  order?: number;
  score?: number;
  indexedObject?: Readonly<Record<string, unknown>>;
  mixed?: string | readonly number[];
  optionalArray?: readonly number[];
  optionalScalar?: string;
  path?: string;
  source?: string;
}

interface MutableNestedRecord extends ContentRecord {
  metadata: {
    labels: string[];
  };
  tags: string[];
}

function record(
  url: string,
  overrides: Omit<Partial<TestRecord>, 'url'> = {},
): TestRecord {
  return { url, draft: false, title: url, ...overrides };
}

describe('createContentTree', () => {
  it('accepts generic records without image metadata and filters drafts', () => {
    const tree = createContentTree([
      record('/about-us'),
      record('/hidden', { draft: true }),
      record('/careers/anyone'),
      record('/'),
    ]);

    expect(tree.root.data?.url).toBe('/');
    expect(
      tree.root.children({ includeVirtual: true }).map((node) => node.segment),
    ).toEqual(['about-us', 'careers']);
    expect(tree.get('/careers/anyone')?.data?.url).toBe('/careers/anyone');
    expect(tree.getByUrl('/hidden')).toBeNull();
  });

  it('accepts genuine plain content records from another JavaScript realm', () => {
    const foreignRecord = runInNewContext(
      `({ url: '/foreign', draft: false, nested: { value: 1 } })`,
    ) as TestRecord & { nested: { value: number } };
    const tree = createContentTree([foreignRecord]);

    expect(tree.require('/foreign').data).toMatchObject({
      nested: { value: 1 },
    });
    expect(tree.require('/foreign').data).not.toBe(foreignRecord);
  });

  it('models absent folders as virtual nodes', () => {
    const tree = createContentTree([record('/'), record('/2026/07/post')]);
    const year = tree.get('/2026');

    expect(year?.kind).toBe('virtual');
    expect(year?.data).toBeUndefined();
    expect(year?.children({ includeVirtual: true })[0]?.url).toBe('/2026/07');
    expect(tree.root.child('2026', { includeVirtual: true })).toBe(year);
  });

  it('keeps public and source paths as distinct indexes', () => {
    const input = record('/guides/public', { rawUrl: '/drafts/guides/public' });
    const tree = createContentTree([record('/'), input], {
      sourcePathKey: 'rawUrl',
    });

    expect(tree.getByUrl('/guides/public')).toBe(tree.get('/guides/public'));
    expect(tree.getBySourcePath('/drafts/guides/public')?.data).toEqual(input);
    expect(tree.get('/drafts/guides/public')).toBeNull();
  });

  it('promotes hidden path fields and excludes hidden draft records', () => {
    const hiddenPaths = {} as TestRecord;
    Object.defineProperties(hiddenPaths, {
      url: { enumerable: false, value: '/public' },
      rawUrl: { enumerable: false, value: '/source/public.md' },
    });
    const hiddenDraft = record('/secret');
    Object.defineProperty(hiddenDraft, 'draft', {
      enumerable: false,
      value: true,
    });
    const tree = createContentTree([hiddenPaths, hiddenDraft]);

    expect(tree.get('/public')?.data).toMatchObject({
      url: '/public',
      rawUrl: '/source/public.md',
    });
    expect(tree.getBySourcePath('/source/public.md')?.url).toBe('/public');
    expect(tree.get('/secret')).toBeNull();
  });

  it('preserves every hidden semantic field with custom path keys', () => {
    const input = {} as TestRecord;
    Object.defineProperties(input, {
      path: { enumerable: false, value: '/tree-path' },
      source: { enumerable: false, value: '/tree-source.md' },
      url: { enumerable: false, value: '/public-url' },
      rawUrl: { enumerable: false, value: '/raw-source.md' },
    });
    const tree = createContentTree([input], {
      pathKey: 'path',
      sourcePathKey: 'source',
    });

    expect(tree.require('/tree-path').data).toMatchObject({
      path: '/tree-path',
      source: '/tree-source.md',
      url: '/public-url',
      rawUrl: '/raw-source.md',
    });
    expect(tree.getByUrl('/public-url')?.url).toBe('/tree-path');
    expect(tree.getBySourcePath('/tree-source.md')?.url).toBe('/tree-path');
    expect(tree.findBy('rawUrl', '/raw-source.md')).toHaveLength(1);
  });

  it('indexes host-selected scalar and array fields', () => {
    const tree = createContentTree(
      [
        record('/'),
        record('/products/security', {
          layout: 'products',
          tags: ['security'],
        }),
        record('/posts/security', { layout: 'post', tags: ['security'] }),
      ],
      { indexKeys: ['layout', 'tags'] },
    );

    expect(tree.firstBy('layout', 'products')?.data?.url).toBe(
      '/products/security',
    );
    expect(
      tree.findBy('tags', 'security').map((node) => node.data?.url),
    ).toEqual(['/products/security', '/posts/security']);
    expect(
      tree.findBy('tags', 'security', { under: '/products' })[0]?.url,
    ).toBe('/products/security');
  });

  it('types mixed and optional array searches by scalar or array element', () => {
    type Mixed = ContentFieldValue<TestRecord, 'mixed'>;
    type OptionalArray = ContentFieldValue<TestRecord, 'optionalArray'>;
    type OptionalScalar = ContentFieldValue<TestRecord, 'optionalScalar'>;

    expectTypeOf<Mixed>().toEqualTypeOf<string | number | undefined>();
    expectTypeOf<OptionalArray>().toEqualTypeOf<number | undefined>();
    expectTypeOf<OptionalScalar>().toEqualTypeOf<string | undefined>();
    // @ts-expect-error array-valued fields are queried by one element, never by the array object
    const invalidQuery: Mixed = [1, 2];
    expect(invalidQuery).toEqual([1, 2]);
  });

  it('types path policies to string-valued record fields only', () => {
    type OpenRecord = ContentRecord & Readonly<Record<string, unknown>>;
    const valid: ContentTreeOptions<TestRecord> = {
      pathKey: 'path',
      sourcePathKey: 'source',
    };
    // @ts-expect-error numeric fields cannot be tree paths
    const numeric: ContentTreeOptions<TestRecord> = { pathKey: 'score' };
    // @ts-expect-error arrays cannot be source paths
    const array: ContentTreeOptions<TestRecord> = { sourcePathKey: 'tags' };
    // @ts-expect-error booleans cannot be tree paths
    const boolean: ContentTreeOptions<TestRecord> = { pathKey: 'draft' };
    const open: ContentTreeOptions<OpenRecord> = { pathKey: 'route' };
    expect([valid, numeric, array, boolean, open]).toHaveLength(5);
  });

  it('never lets node-scoped searches escape their receiver subtree', () => {
    const tree = createContentTree(
      [
        record('/a', { layout: 'inside' }),
        record('/a/child', { layout: 'inside' }),
        record('/b', { layout: 'outside' }),
      ],
      { indexKeys: ['layout'] },
    );
    const node = tree.require('/a');
    const hostileOptions = {
      under: '/b',
      includeSelf: true,
    } as never;

    expect(node.find(() => true, hostileOptions).map(({ url }) => url)).toEqual(
      ['/a', '/a/child'],
    );
    expect(node.findBy('layout', 'outside', hostileOptions)).toEqual([]);
    expect(node.firstBy('layout', 'outside', hostileOptions)).toBeNull();
  });

  it('sorts siblings once and supports explicit wrapping', () => {
    const tree = createContentTree(
      [record('/'), record('/a', { order: 2 }), record('/b', { order: 1 })],
      {
        sortSiblings: (left, right) =>
          (left.data?.order ?? 0) - (right.data?.order ?? 0),
      },
    );

    expect(tree.root.children().map((node) => node.url)).toEqual(['/b', '/a']);
    expect(tree.get('/a')?.next()?.url).toBe('/b');
    expect(tree.get('/a')?.next({ wrap: false })).toBeNull();
  });

  it('never wraps a lone visible sibling back to itself', () => {
    const tree = createContentTree([record('/only'), record('/virtual/deep')]);
    const only = tree.require('/only');

    expect(only.siblings()).toEqual([]);
    expect(only.next()).toBeNull();
    expect(only.previous()).toBeNull();
    expect(tree.next('/only')).toBeNull();
    expect(tree.previous('/only')).toBeNull();
    expect(only.next({ includeVirtual: true })?.url).toBe('/virtual');
    expect(only.previous({ includeVirtual: true })?.url).toBe('/virtual');
  });

  it('uses typed duplicate errors and stable winner policies', () => {
    const first = record('/same', { title: 'first' });
    const last = record('/same/', { title: 'last' });

    try {
      createContentTree([first, last]);
      throw new Error('Expected duplicate error');
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateContentPathError);
      expect((error as DuplicateContentPathError).path).toBe('/same');
    }
    expect(
      createContentTree([first, last], {
        duplicatePath: 'first-wins',
      }).get('/same')?.data?.title,
    ).toBe('first');
    expect(
      createContentTree([first, last], {
        duplicatePath: 'last-wins',
      }).get('/same')?.data?.title,
    ).toBe('last');
  });

  it('defines index-page collapse and preserve policies', () => {
    expect(normalizeContentPath('/docs/index')).toBe('/docs');
    expect(normalizeContentPath('/docs/index', { indexPage: 'preserve' })).toBe(
      '/docs/index',
    );
    expect(() =>
      createContentTree([record('/docs'), record('/docs/index')]),
    ).toThrow(DuplicateContentPathError);
    const preserved = createContentTree(
      [record('/docs'), record('/docs/index')],
      {
        indexPage: 'preserve',
      },
    );
    expect(preserved.get('/docs/index')?.data?.url).toBe('/docs/index');
    expect(preserved.get('/docs/index')?.segment).toBe('index');
    expect(preserved.get('/docs/index')?.parent()?.url).toBe('/docs');
  });

  it('applies a custom path normalizer once while building each record', () => {
    const normalizePath = vi.fn(
      (path: string) =>
        `/normalized${normalizeContentPath(path, { indexPage: 'preserve' })}`,
    );
    const tree = createContentTree([record('/docs/index')], { normalizePath });

    expect(normalizePath).toHaveBeenCalledTimes(1);
    expect(tree.root.child('normalized', { includeVirtual: true })?.url).toBe(
      '/normalized',
    );
    expect(tree.get('/docs/index')?.segment).toBe('index');
    expect(normalizePath).toHaveBeenCalledTimes(2);
  });

  it('provides typed required lookup failures', () => {
    const tree = createContentTree([record('/')]);
    expect(() => tree.require('/missing')).toThrow(MissingContentPathError);
    try {
      tree.require('/missing/');
    } catch (error) {
      expect((error as MissingContentPathError).path).toBe('/missing');
    }
    expect(() => createContentTree([{ draft: false } as never])).toThrow(
      MissingContentPathError,
    );
  });

  it('normalizes required and scan lookup values exactly once', () => {
    const normalizePath = vi.fn((path: string) => normalizeContentPath(path));
    const tree = createContentTree([record('/docs')], { normalizePath });
    normalizePath.mockClear();
    expect(() => tree.require('/missing/')).toThrow(MissingContentPathError);
    expect(normalizePath).toHaveBeenCalledTimes(1);
    expect((normalizePath.mock.calls[0] ?? [])[0]).toBe('/missing/');

    normalizePath.mockClear();
    expect(tree.findBy('url', '/docs/', { useIndex: false })).toHaveLength(1);
    expect(normalizePath).toHaveBeenCalledTimes(1);
  });

  it('snapshots and freezes records and all returned collections', () => {
    const input = [record('/'), record('/b'), record('/a')];
    const tree = createContentTree(input);
    (input[1] as { url: string }).url = '/changed';

    expect(tree.get('/b')?.data?.url).toBe('/b');
    expect(tree.get('/changed')).toBeNull();
    expect(tree.items[1]).not.toBe(input[1]);
    expect(Object.isFrozen(tree.items)).toBe(true);
    expect(Object.isFrozen(tree.items[1])).toBe(true);
    expect(Object.isFrozen(tree.root.children())).toBe(true);
    expect(Object.isFrozen(tree.root.descendants())).toBe(true);
    expect(Object.isFrozen(tree.find(() => true))).toBe(true);
    expect(Object.isFrozen(tree.root.siblings())).toBe(true);
  });

  it('keeps the runtime tree and nodes immutable from JavaScript callers', () => {
    const tree = createContentTree([record('/'), record('/child')]);
    const root = tree.root;
    const treePrototype = Object.getPrototypeOf(tree) as object;
    const nodePrototype = Object.getPrototypeOf(root) as object;
    const treeConstructor = tree.constructor;
    const nodeConstructor = root.constructor;

    expect(Object.isFrozen(tree)).toBe(true);
    expect(Object.isFrozen(root)).toBe(true);
    expect(Object.isFrozen(treePrototype)).toBe(true);
    expect(Object.isFrozen(nodePrototype)).toBe(true);
    expect(Object.isFrozen(treeConstructor)).toBe(true);
    expect(Object.isFrozen(nodeConstructor)).toBe(true);
    expect(Object.getOwnPropertyNames(tree)).not.toContain('byPath');
    expect(Object.getOwnPropertyNames(root)).not.toContain('childrenBySegment');
    expect(Reflect.set(tree, 'root', null)).toBe(false);
    expect(Reflect.set(root, 'url', '/tampered')).toBe(false);
    expect(
      Reflect.defineProperty(treePrototype, 'get', {
        value: () => ({ url: '/forged' }),
      }),
    ).toBe(false);
    expect(
      Reflect.defineProperty(nodePrototype, 'children', {
        value: () => [{ url: '/forged' }],
      }),
    ).toBe(false);
    expect(
      Reflect.defineProperty(root, 'children', {
        value: () => [],
      }),
    ).toBe(false);
    expect(
      Reflect.defineProperty(nodeConstructor, Symbol.hasInstance, {
        value: () => false,
      }),
    ).toBe(false);
    const reachableNodeConstructor = nodeConstructor as unknown as new (
      options: Record<string, unknown>,
    ) => typeof root;
    expect(
      () =>
        new reachableNodeConstructor({
          data: record('/forged'),
          url: '/forged',
          segment: 'forged',
          parent: null,
          tree,
          virtual: false,
        }),
    ).toThrow(/cannot be constructed outside/);
    const prototypeForgery = Object.create(nodePrototype) as typeof root;
    expect(
      tree.find(() => true, {
        under: prototypeForgery,
        includeSelf: true,
      }),
    ).toEqual([]);

    const internalNode = root as unknown as {
      setData(data: TestRecord, url: string, token: symbol): void;
      sortDeep(sort: undefined, token: symbol): void;
    };
    expect(() =>
      internalNode.setData(record('/tampered'), '/tampered', Symbol()),
    ).toThrow(/immutable/);
    expect(() => internalNode.sortDeep(undefined, Symbol())).toThrow(
      /immutable/,
    );
    expect(tree.get('/child')).not.toBeNull();
    expect(tree.find(() => true, { under: root })).toHaveLength(1);
    expect(tree.root.url).toBe('/');
  });

  it('locks comparator inputs before invoking host sibling sorting', () => {
    const forged = { url: '/forged', nested: { mutable: true } };
    const tree = createContentTree([record('/a'), record('/b')], {
      sortSiblings(left) {
        expect(Reflect.set(left, 'url', '/tampered')).toBe(false);
        expect(Reflect.set(left, 'data', forged)).toBe(false);
        expect(
          Reflect.defineProperty(left, 'children', {
            value: () => [{ url: '/forged' }],
          }),
        ).toBe(false);
        expect(Reflect.setPrototypeOf(left, {})).toBe(false);
        return 0;
      },
    });

    expect(tree.get('/tampered')).toBeNull();
    expect(tree.get('/a')?.data).not.toBe(forged);
    expect(Object.isFrozen(tree.get('/a')?.data)).toBe(true);
  });

  it('captures default index-page policy without retaining caller options', () => {
    const options: { indexPage: 'collapse' | 'preserve' } = {
      indexPage: 'collapse',
    };
    const tree = createContentTree([record('/docs/index')], options);
    options.indexPage = 'preserve';

    expect(tree.get('/docs/index')?.url).toBe('/docs');
    expect(tree.get('/docs')).not.toBeNull();
  });

  it('resolves exact stored keys before applying a non-idempotent normalizer', () => {
    const collapsed = createContentTree([
      record('/index/index'),
      record('/a/index/index'),
    ]);
    for (const path of ['/index', '/a/index']) {
      const node = collapsed.require(path);
      expect(node.virtual).toBe(false);
      expect(collapsed.get(node.url)).toBe(node);
      expect(collapsed.getByUrl(node.url)).toBe(node);
      expect(collapsed.findBy('url', node.url)).toContain(node);
      expect(collapsed.findBy('url', node.url, { useIndex: false })).toContain(
        node,
      );
    }

    const prefixed = createContentTree(
      [
        {
          path: '/docs',
          source: '/source',
          url: '/public',
          rawUrl: '/raw',
          draft: false,
        },
      ],
      {
        pathKey: 'path',
        sourcePathKey: 'source',
        indexKeys: [],
        normalizePath: (path) =>
          `/tenant${normalizeContentPath(path, { indexPage: 'preserve' })}`,
      },
    );
    const node = prefixed.require('/tenant/docs');
    expect(prefixed.get(node.url)).toBe(node);
    expect(prefixed.findBy('path', node.url)).toEqual([node]);
    expect(prefixed.findBy('path', node.url, { useIndex: false })).toEqual([
      node,
    ]);
    expect(prefixed.findBy('url', '/tenant/public')).toEqual([node]);
    expect(
      prefixed.findBy('url', '/tenant/public', { useIndex: false }),
    ).toEqual([node]);
    expect(prefixed.findBy('rawUrl', '/tenant/raw')).toEqual([node]);
    expect(
      prefixed.findBy('rawUrl', '/tenant/raw', { useIndex: false }),
    ).toEqual([node]);
  });

  it('rejects malformed semantic record fields at runtime', () => {
    for (const malformed of [
      { path: '/missing-url' },
      { path: '/numeric-url', url: 123 },
      { path: '/numeric-source', url: '/ok', source: 123 },
      { path: '/numeric-raw', url: '/ok', rawUrl: 123 },
      { path: '/string-draft', url: '/ok', draft: 'true' },
    ]) {
      expect(() =>
        createContentTree<TestRecord>([malformed as never], {
          pathKey: 'path',
          sourcePathKey: 'source',
        }),
      ).toThrow();
    }
  });

  it('deeply detaches nested metadata and keeps indexes stable', () => {
    const input: MutableNestedRecord = {
      url: '/nested',
      metadata: { labels: ['original'] },
      tags: ['indexed'],
    };
    const tree = createContentTree([input], { indexKeys: ['tags'] });
    const snapshot = tree.items[0];
    expect(snapshot).toBeDefined();
    if (!snapshot) throw new Error('Expected a content snapshot.');

    input.metadata.labels[0] = 'changed';
    input.tags[0] = 'changed';

    expect(snapshot.metadata.labels).toEqual(['original']);
    expect(tree.findBy('tags', 'indexed')).toHaveLength(1);
    expect(tree.findBy('tags', 'changed')).toHaveLength(0);
    expect(Object.isFrozen(snapshot.metadata)).toBe(true);
    expect(Object.isFrozen(snapshot.metadata.labels)).toBe(true);
    expectTypeOf(snapshot.metadata.labels).toEqualTypeOf<readonly string[]>();
  });

  it('rejects accessors without executing them and ignores inherited draft/path data', () => {
    let reads = 0;
    const accessorRecord = { url: '/accessor' } as Record<string, unknown>;
    Object.defineProperty(accessorRecord, 'draft', {
      enumerable: true,
      get: () => {
        reads += 1;
        return true;
      },
    });
    expect(() => createContentTree([accessorRecord as never])).toThrow(
      TypeError,
    );
    expect(reads).toBe(0);

    const inheritedPath = JSON.parse(
      '{"__proto__":{"url":"/inherited"}}',
    ) as TestRecord;
    expect(() => createContentTree([inheritedPath])).toThrow(
      MissingContentPathError,
    );
    const inheritedDraft = JSON.parse(
      '{"url":"/draft-bypass","__proto__":{"draft":true}}',
    ) as TestRecord;
    const tree = createContentTree([inheritedDraft]);
    expect(tree.get('/draft-bypass')).not.toBeNull();
    expect(tree.items[0]?.draft).toBeUndefined();
  });

  it('keeps indexed and scan equality/scope semantics aligned', () => {
    const tree = createContentTree(
      [record('/a', { score: Number.NaN }), record('/b', { score: 1 })],
      { indexKeys: ['score'] },
    );
    expect(tree.findBy('score', Number.NaN)).toHaveLength(1);
    expect(tree.findBy('score', Number.NaN, { useIndex: false })).toHaveLength(
      1,
    );

    const foreignTree = createContentTree(
      [record('/a', { score: Number.NaN })],
      {
        indexKeys: ['score'],
      },
    );
    expect(tree.find(() => true, { under: foreignTree.root })).toEqual([]);
    expect(
      tree.findBy('score', Number.NaN, { under: foreignTree.root }),
    ).toEqual([]);
  });

  it('treats blank path-index values as absent in indexed and scan searches', () => {
    const tree = createContentTree(
      [
        record('/blank', { rawUrl: '' }),
        record('/whitespace', { rawUrl: '   ' }),
        record('/source', { rawUrl: '/source.md' }),
      ],
      { indexKeys: ['rawUrl'] },
    );

    for (const value of ['', '   ']) {
      expect(tree.findBy('rawUrl', value)).toEqual([]);
      expect(tree.findBy('rawUrl', value, { useIndex: false })).toEqual([]);
    }
    expect(tree.findBy('rawUrl', '/source.md')).toHaveLength(1);
    expect(
      tree.findBy('rawUrl', '/source.md', { useIndex: false }),
    ).toHaveLength(1);
  });

  it('rejects object-valued index fields', () => {
    expect(() =>
      createContentTree(
        [record('/object', { indexedObject: { nested: true } })],
        { indexKeys: ['indexedObject'] },
      ),
    ).toThrow(/primitive values/);
  });

  it('rejects unsafe output from a custom tree normalizer', () => {
    expect(() =>
      createContentTree([record('/boxed')], {
        normalizePath: (() => new String('/boxed')) as never,
      }),
    ).toThrow(/return a string/);
    const boxedTree = createContentTree([], {
      normalizePath: (() => new String('/boxed')) as never,
    });
    expect(() => boxedTree.get('/anything')).toThrow(/return a string/);
    expect(() =>
      createContentTree([record('/unsafe')], {
        normalizePath: () => '/../unsafe',
      }),
    ).toThrow(TypeError);
    expect(() =>
      createContentTree([record('/unsafe')], {
        normalizePath: () => 'relative',
      }),
    ).toThrow(TypeError);
    for (const unsafe of ['/a\\..\\admin', '/line\nfeed', '/%2e%2e/admin']) {
      expect(() =>
        createContentTree([record('/unsafe')], {
          normalizePath: () => unsafe,
        }),
      ).toThrow(TypeError);
    }
  });

  it('keeps cached order unchanged when a caller asks for custom sorting', () => {
    const tree = createContentTree([record('/'), record('/b'), record('/a')]);
    const cached = tree.root.children();
    const sorted = tree.root.children({
      sort: (left, right) => left.url.localeCompare(right.url),
    });

    expect(tree.root.children()).toBe(cached);
    expect(sorted.map((node) => node.url)).toEqual(['/a', '/b']);
    expect(cached.map((node) => node.url)).toEqual(['/b', '/a']);
    expect(Object.isFrozen(sorted)).toBe(true);
  });

  it('supports the complete node and tree traversal surface', () => {
    const tree = createContentTree(
      [
        record('/'),
        record('/section', { layout: 'section' }),
        record('/section/child', { layout: 'post', tags: ['one'] }),
        record('/section/other', { layout: 'post', tags: ['two'] }),
        record('/virtual/deep', { layout: 'post' }),
      ],
      { indexKeys: ['layout', 'tags'], wrapSiblings: false },
    );
    const section = tree.require('/section');
    const child = tree.require('/section/child');

    expect(splitContentPath(' section//child/?query')).toEqual([
      'section',
      'child',
    ]);
    expect(section.child('/child/')?.url).toBe('/section/child');
    expect(tree.root.child('virtual')).toBeNull();
    expect(tree.root.child('virtual', { includeVirtual: true })?.virtual).toBe(
      true,
    );
    expect(tree.require('/virtual/deep').parent()).toBe(tree.root);
    expect(
      tree.require('/virtual/deep').parent({ skipVirtual: false })?.url,
    ).toBe('/virtual');
    expect(
      section.descendants({ includeSelf: true }).map(({ url }) => url),
    ).toEqual(['/section', '/section/child', '/section/other']);
    expect(
      section
        .descendants({
          sort: (left, right) => right.url.localeCompare(left.url),
        })
        .map(({ url }) => url),
    ).toEqual(['/section/other', '/section/child']);
    expect(child.siblings().map(({ url }) => url)).toEqual(['/section/other']);
    expect(tree.root.siblings()).toEqual([]);
    expect(child.previous()).toBeNull();
    expect(child.next()?.url).toBe('/section/other');
    expect(tree.require('/section/other').next()).toBeNull();
    expect(tree.root.next()).toBeNull();
    expect(section.hasChildren()).toBe(true);
    expect(child.hasChildren()).toBe(false);
    expect(section.find((node) => node.data?.layout === 'post')).toHaveLength(
      2,
    );
    expect(section.findBy('tags', 'one')[0]?.url).toBe('/section/child');
    expect(section.firstBy('tags', 'missing')).toBeNull();

    expect(tree.children('/section')).toHaveLength(2);
    expect(tree.children('/missing')).toEqual([]);
    expect(tree.descendants('/section')).toHaveLength(2);
    expect(tree.descendants('/missing')).toEqual([]);
    expect(tree.parent('/section/child')?.url).toBe('/section');
    expect(tree.parent('/missing')).toBeNull();
    expect(tree.next('/section/child')?.url).toBe('/section/other');
    expect(tree.next('/missing')).toBeNull();
    expect(tree.previous('/section/other')?.url).toBe('/section/child');
    expect(tree.previous('/missing')).toBeNull();
    expect(tree.find(() => true, { under: '/missing' })).toEqual([]);
    expect(
      tree.find(() => true, { under: section, deep: false, includeSelf: true }),
    ).toHaveLength(3);
    expect(tree.findBy('tags', 'one', { useIndex: false })[0]?.url).toBe(
      '/section/child',
    );
    expect(
      tree
        .findBy('layout', 'post', {
          under: '/section',
          includeSelf: true,
          sort: (left, right) => right.url.localeCompare(left.url),
        })
        .map(({ url }) => url),
    ).toEqual(['/section/other', '/section/child']);
  });

  it('supports explicit draft inclusion and source-index collision policies', () => {
    expect(
      createContentTree([record('/draft', { draft: true })], {
        includeDrafts: true,
      }).get('/draft')?.data?.draft,
    ).toBe(true);

    const first = record('/first', { rawUrl: '/same-source' });
    const last = record('/last', { rawUrl: '/same-source' });
    expect(() => createContentTree([first, last])).toThrow(
      DuplicateContentPathError,
    );
    expect(
      createContentTree([first, last], {
        duplicatePath: 'first-wins',
      }).getBySourcePath('/same-source')?.url,
    ).toBe('/first');
    expect(
      createContentTree([first, last], {
        duplicatePath: 'last-wins',
      }).getBySourcePath('/same-source')?.url,
    ).toBe('/last');
  });

  it('normalizes root, relative, duplicate-separator, and suffix paths', () => {
    expect(normalizeContentPath('')).toBe('/');
    expect(normalizeContentPath('docs//guide///?query#fragment')).toBe(
      '/docs/guide',
    );
    expect(normalizeContentPath('/index')).toBe('/');
    const segments = splitContentPath('/', (path) => path);
    expectTypeOf(segments).toEqualTypeOf<readonly string[]>();
    expect(segments).toEqual([]);
    expect(Object.isFrozen(segments)).toBe(true);
  });

  it('requires custom path splitters to return one canonical tree path', () => {
    const normalizePath = vi.fn(() => '/docs/guide');
    expect(splitContentPath('source', normalizePath)).toEqual([
      'docs',
      'guide',
    ]);
    expect(normalizePath).toHaveBeenCalledOnce();

    for (const invalid of ['relative', '', '/a?query', new String('/boxed')]) {
      expect(() => splitContentPath('source', () => invalid as string)).toThrow(
        TypeError,
      );
    }
  });

  it('rejects unsafe paths through the public normalizer itself', () => {
    for (const unsafe of [
      '/a\\..\\admin',
      '/safe\u0000admin',
      '/%2e%2e/admin',
      '/a/%2E/admin',
    ]) {
      expect(() => normalizeContentPath(unsafe)).toThrow(TypeError);
    }
  });

  it('is idempotent on valid spaced paths and rejects boundary whitespace', () => {
    const valid = normalizeContentPath('/a valid path/index');
    expect(valid).toBe('/a valid path');
    expect(normalizeContentPath(valid)).toBe(valid);

    for (const unstable of [
      '/a /',
      '/a #fragment',
      '/a ?query=1',
      '/a /index',
      '/a/ /',
    ]) {
      expect(() => normalizeContentPath(unstable)).toThrow(TypeError);
    }

    const tree = createContentTree([record('/a valid path/')]);
    const node = tree.require('/a valid path');
    expect(tree.get(node.url)).toBe(node);
  });
});
