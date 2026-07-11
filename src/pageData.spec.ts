import { runInNewContext } from 'node:vm';

import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  normalizeFrontmatter,
  type FrontmatterInput,
  type PageDataLike,
} from './pageData';
import { createContentTree } from './pages';

describe('normalizeFrontmatter', () => {
  it('accepts ordinary host interfaces without a string index signature', () => {
    interface ArticleFrontmatter {
      readonly title: string;
      readonly url?: string;
    }
    const pageData: PageDataLike<ArticleFrontmatter> = {
      url: '/article',
      frontmatter: { title: 'Article' },
    };

    const normalized = normalizeFrontmatter(pageData);
    expectTypeOf(normalized.title).toEqualTypeOf<string>();
    expect(normalized).toEqual({ title: 'Article', url: '/article' });
  });

  it('accepts deeply frozen generic records without images and returns a detached record', () => {
    const frontmatter = Object.freeze({
      draft: false,
      custom: Object.freeze({ value: 1 }),
    });
    const pageData = Object.freeze({
      relativePath: 'guides/überblick.md',
      frontmatter,
    });

    const normalized = normalizeFrontmatter(pageData);

    expect(normalized).toEqual({
      draft: false,
      custom: { value: 1 },
      url: '/guides/überblick',
    });
    expect(normalized).not.toBe(frontmatter);
    expect(pageData.frontmatter).toBe(frontmatter);
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized.custom)).toBe(true);
  });

  it('preserves custom fields and applies only host-provided path policy', () => {
    const normalized = normalizeFrontmatter(
      {
        url: '/Drafts/My Page?x=A#Heading',
        frontmatter: {
          image: '/host-owned.webp',
          cover: { image: '/legacy-stays-host-owned.webp' },
        },
      },
      {
        formatPath: (path) => path.replace('/Drafts/', '/docs/'),
      },
    );

    expect(normalized).toEqual({
      image: '/host-owned.webp',
      cover: { image: '/legacy-stays-host-owned.webp' },
      url: '/docs/My Page?x=A#Heading',
      rawUrl: '/Drafts/My Page?x=A#Heading',
    });
  });

  it('requires host path formatters to return a non-empty primitive string', () => {
    for (const invalid of [undefined, null, '', '   ', new String('/boxed')]) {
      expect(() =>
        normalizeFrontmatter(
          { url: '/source', frontmatter: {} },
          { formatPath: () => invalid as string },
        ),
      ).toThrow(TypeError);
    }
  });

  it('rejects malformed present semantic frontmatter fields', () => {
    for (const frontmatter of [
      { url: 123 },
      { rawUrl: 123 },
      { draft: 'true' },
    ]) {
      expect(() =>
        normalizeFrontmatter({
          url: '/valid',
          frontmatter: frontmatter as never,
        }),
      ).toThrow(TypeError);
    }
  });

  it('removes only a terminal index filename', () => {
    expect(
      normalizeFrontmatter({
        relativePath: 'guides/reindex.md',
        frontmatter: {},
      }).url,
    ).toBe('/guides/reindex');
    expect(
      normalizeFrontmatter({
        relativePath: 'guides/index.md',
        frontmatter: {},
      }).url,
    ).toBe('/guides');
  });

  it('is idempotent and can omit rawUrl', () => {
    const first = normalizeFrontmatter(
      {
        url: '/same',
        frontmatter: { url: '/old', rawUrl: '/source', custom: true },
      },
      { preserveRawUrl: false },
    );
    const second = normalizeFrontmatter({ frontmatter: first });

    expect(first).toEqual({ url: '/same', rawUrl: '/source', custom: true });
    expect(second).toEqual(first);
  });

  it('rejects records without any path source', () => {
    expect(() => normalizeFrontmatter({ frontmatter: {} })).toThrow(TypeError);
    expect(() => normalizeFrontmatter({ frontmatter: { url: '   ' } })).toThrow(
      TypeError,
    );
  });

  it('falls back past blank path candidates without removing internal spaces', () => {
    expect(
      normalizeFrontmatter({
        url: '   ',
        relativePath: 'valid path.md',
        frontmatter: { url: '/fallback' },
      }).url,
    ).toBe('/valid path');
    expect(
      normalizeFrontmatter({
        relativePath: '  ',
        frontmatter: { url: '/frontmatter path' },
      }).url,
    ).toBe('/frontmatter path');
  });

  it('requires plain-object root frontmatter and always emits the derived URL override', () => {
    expect(() =>
      normalizeFrontmatter({
        url: '/array',
        frontmatter: [] as never,
      }),
    ).toThrow(/plain object/);
    expect(() =>
      normalizeFrontmatter({
        url: '/date',
        frontmatter: new Date() as never,
      }),
    ).toThrow(/plain object/);

    const frontmatter = { title: 'Visible' } as Record<string, unknown>;
    Object.defineProperty(frontmatter, 'url', {
      enumerable: false,
      value: '/hidden',
    });
    const normalized = normalizeFrontmatter({ frontmatter });
    expect(normalized).toEqual({ title: 'Visible', url: '/hidden' });
    expect(Object.hasOwn(normalized, 'url')).toBe(true);
  });

  it('promotes hidden semantic fields while omitting arbitrary hidden metadata', () => {
    const frontmatter = { title: 'Hidden semantics' } as Record<
      string,
      unknown
    >;
    Object.defineProperties(frontmatter, {
      rawUrl: { enumerable: false, value: '/source/original.md' },
      draft: { enumerable: false, value: true },
      privateNote: { enumerable: false, value: 'omit-me' },
    });

    const normalized = normalizeFrontmatter({
      url: '/public',
      frontmatter,
    });

    expect(normalized).toEqual({
      title: 'Hidden semantics',
      url: '/public',
      rawUrl: '/source/original.md',
      draft: true,
    });
    expect(createContentTree([normalized]).get('/public')).toBeNull();
  });

  it('deeply detaches arrays and plain objects from mutable input', () => {
    const frontmatter = {
      nested: { labels: ['original'] },
    };
    const normalized = normalizeFrontmatter({ url: '/nested', frontmatter });

    frontmatter.nested.labels[0] = 'changed';

    expect(normalized.nested.labels).toEqual(['original']);
    expect(Object.isFrozen(normalized.nested)).toBe(true);
    expect(Object.isFrozen(normalized.nested.labels)).toBe(true);
  });

  it('preserves host tuple positions in the deep-readonly result type', () => {
    const normalized = normalizeFrontmatter({
      url: '/tuple',
      frontmatter: { coordinates: [1, 'north'] as const },
    });

    expect(normalized.coordinates).toEqual([1, 'north']);
    expectTypeOf(normalized.coordinates).toEqualTypeOf<readonly [1, 'north']>();
  });

  it('rejects executable or class-instance metadata', () => {
    expect(() =>
      normalizeFrontmatter({
        url: '/function',
        frontmatter: { callback: () => undefined },
      }),
    ).toThrow(TypeError);
    expect(() =>
      normalizeFrontmatter({
        url: '/map',
        frontmatter: { custom: new Map() },
      }),
    ).toThrow(TypeError);
  });

  it('clones dates and supports cycles while rejecting accessors', () => {
    const createdAt = new Date('2026-07-10T00:00:00.000Z');
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const normalized = normalizeFrontmatter({
      url: '/structured',
      frontmatter: { createdAt, cyclic },
    });

    expect(normalized.createdAt).not.toBe(createdAt);
    expect(normalized.createdAt.getTime()).toBe(createdAt.getTime());
    expect(() => (normalized.createdAt as unknown as Date).setTime(0)).toThrow(
      TypeError,
    );
    expect(normalized.cyclic.self).toBe(normalized.cyclic);

    let accessorReads = 0;
    const withAccessor = {} as Record<string, unknown>;
    Object.defineProperty(withAccessor, 'value', {
      enumerable: true,
      get: () => {
        accessorReads += 1;
        return 'unsafe';
      },
    });
    expect(() =>
      normalizeFrontmatter({
        url: '/accessor',
        frontmatter: withAccessor,
      }),
    ).toThrow(TypeError);
    expect(accessorReads).toBe(0);

    const withHidden = { visible: true } as Record<string, unknown>;
    Object.defineProperty(withHidden, 'hidden', {
      value: true,
      enumerable: false,
    });
    expect(
      normalizeFrontmatter({ url: '/hidden', frontmatter: withHidden }),
    ).toEqual({
      url: '/hidden',
      visible: true,
    });
  });

  it('clones dates through the intrinsic without invoking an own getTime accessor', () => {
    const createdAt = new Date('2026-07-10T00:00:00.000Z');
    let reads = 0;
    Object.defineProperty(createdAt, 'getTime', {
      configurable: true,
      enumerable: true,
      get() {
        reads += 1;
        return () => 0;
      },
    });

    const normalized = normalizeFrontmatter({
      url: '/safe-date',
      frontmatter: { createdAt },
    });

    expect(reads).toBe(0);
    expect((normalized.createdAt as Date).getTime()).toBe(
      Date.parse('2026-07-10T00:00:00.000Z'),
    );
  });

  it('accepts detached plain records and dates from another JavaScript realm', () => {
    const foreignFrontmatter = runInNewContext(`({
      title: 'foreign',
      nested: { value: 1 },
      createdAt: new Date('2026-07-10T00:00:00.000Z')
    })`) as FrontmatterInput & {
      title: string;
      nested: { value: number };
      createdAt: Date;
    };
    const normalized = normalizeFrontmatter({
      url: '/foreign',
      frontmatter: foreignFrontmatter,
    });

    expect(normalized).toMatchObject({
      url: '/foreign',
      title: 'foreign',
      nested: { value: 1 },
    });
    expect(normalized).not.toBe(foreignFrontmatter);
    expect(normalized.nested).not.toBe(foreignFrontmatter.nested);
    expect((normalized.createdAt as Date).getTime()).toBe(
      Date.parse('2026-07-10T00:00:00.000Z'),
    );
  });

  it('recognizes its immutable dates across normalization and tree pipelines', () => {
    const first = normalizeFrontmatter({
      url: '/dated',
      frontmatter: {
        createdAt: new Date('2026-07-10T00:00:00.000Z'),
      },
    });
    const second = normalizeFrontmatter({ frontmatter: first });
    const nested = normalizeFrontmatter({
      url: '/nested-date',
      frontmatter: { nested: { createdAt: first.createdAt } },
    });
    const firstTree = createContentTree([first]);
    const secondTree = createContentTree(firstTree.items);

    expect((second.createdAt as Date).getTime()).toBe(
      Date.parse('2026-07-10T00:00:00.000Z'),
    );
    expect((nested.nested.createdAt as Date).getTime()).toBe(
      Date.parse('2026-07-10T00:00:00.000Z'),
    );
    expect(firstTree.require('/dated').data).toBeDefined();
    expect(secondTree.require('/dated').data).toBeDefined();
  });

  it('preserves root cycles, sparse arrays, symbols, and dangerous own keys safely', () => {
    const symbol = Symbol('metadata');
    const sparse: unknown[] = new Array(3);
    sparse[2] = 'last';
    const frontmatter = JSON.parse(
      '{"__proto__":{"polluted":true},"constructor":"own"}',
    ) as Record<PropertyKey, unknown> & { self?: unknown };
    frontmatter.self = frontmatter;
    frontmatter.sparse = sparse;
    frontmatter[symbol] = 'symbol-value';

    const normalized = normalizeFrontmatter({
      url: '/structured-root',
      frontmatter,
    }) as Readonly<Record<PropertyKey, unknown>>;

    expect(normalized.self).toBe(normalized);
    const normalizedSparse = normalized.sparse as readonly unknown[];
    expect(normalizedSparse).toHaveLength(3);
    expect(0 in normalizedSparse).toBe(false);
    expect(2 in normalizedSparse).toBe(true);
    expect(normalizedSparse[2]).toBe('last');
    expect(Object.hasOwn(normalized, '__proto__')).toBe(true);
    expect(Object.getPrototypeOf(normalized)).toBe(Object.prototype);
    expect((normalized as { polluted?: boolean }).polluted).toBeUndefined();
    expect(normalized.constructor).toBe('own');
    expect(normalized[symbol]).toBe('symbol-value');
  });
});
