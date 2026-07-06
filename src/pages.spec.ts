import { describe, expect, it } from 'vitest';

import { createContentTree } from './pages';
import type { IFrontmatter } from './types';

function createFrontmatter(
  url: string,
  overrides: Partial<IFrontmatter> = {},
): IFrontmatter {
  return {
    title: url,
    description: url,
    publishDate: '',
    image: '',
    draft: false,
    url,
    is_main: false,
    ...overrides,
  };
}

describe('createContentTree', () => {
  it('filters drafts while preserving root and direct children', () => {
    const tree = createContentTree([
      createFrontmatter('/about-us'),
      createFrontmatter('/book-a-call', { draft: true }),
      createFrontmatter('/careers'),
      createFrontmatter('/careers/anyone'),
      createFrontmatter('/'),
    ]);

    expect(tree.root.data?.url).toBe('/');
    expect(tree.root.children().map((node) => node.segment)).toEqual(['about-us', 'careers']);
    expect(tree.get('/careers')?.child('anyone')?.data?.url).toBe('/careers/anyone');
    expect(tree.getByUrl('/book-a-call')).toBeNull();
  });

  it('models missing folders as virtual nodes without fake frontmatter', () => {
    const tree = createContentTree([
      createFrontmatter('/2024/10'),
      createFrontmatter('/'),
    ]);

    const year = tree.get('/2024');

    expect(year?.kind).toBe('virtual');
    expect(year?.virtual).toBe(true);
    expect(year?.data).toBeUndefined();
    expect(year?.children({ includeVirtual: true })[0]?.data?.url).toBe('/2024/10');
    expect(tree.root.child('2024', { includeVirtual: true })).toBe(year);
  });

  it('keeps literal URL segments, including dots, spaces, uppercase, and numbers', () => {
    const url = '/products/Archive Library/fund.managment/1';
    const tree = createContentTree([
      createFrontmatter('/'),
      createFrontmatter(url, { slug: 'fund.managment' }),
    ]);

    expect(tree.getByUrl(`${url}/`)?.data?.slug).toBe('fund.managment');
    expect(tree.get('/products/Archive Library')?.kind).toBe('virtual');
    expect(tree.get('/products/Archive Library/fund.managment/1')?.data?.url).toBe(url);
  });

  it('keeps public URLs and source paths as separate lookup dimensions', () => {
    const page = createFrontmatter('/guides/public-release', {
      rawUrl: '/guides/internal-drafts/public-release',
    });
    const tree = createContentTree([createFrontmatter('/'), page], {
      sourcePathKey: 'rawUrl',
    });

    expect(tree.getByUrl('/guides/public-release')).toBe(tree.get('/guides/public-release'));
    expect(tree.getBySourcePath('/guides/internal-drafts/public-release')?.data).toBe(page);
    expect(tree.get('/guides/internal-drafts/public-release')).toBeNull();
  });

  it('skips virtual parents by default and can expose them explicitly', () => {
    const tree = createContentTree([
      createFrontmatter('/'),
      createFrontmatter('/docs'),
      createFrontmatter('/docs/security/nist-800-63b'),
    ]);
    const page = tree.get('/docs/security/nist-800-63b');

    expect(page?.parent()?.data?.url).toBe('/docs');
    expect(page?.parent({ skipVirtual: false })?.url).toBe('/docs/security');
  });

  it('uses indexed scalar and array lookups, including subtree scope', () => {
    const product = createFrontmatter('/products/security', {
      layout: 'products',
      tags: ['security'],
    });
    const post = createFrontmatter('/resource-center/security-post', {
      layout: 'resource-center-single',
      tags: ['security'],
    });
    const tree = createContentTree([
      createFrontmatter('/'),
      createFrontmatter('/products'),
      product,
      post,
    ], {
      indexKeys: ['layout', 'tags'],
    });

    expect(tree.firstBy('layout', 'products')?.data).toBe(product);
    expect(tree.findBy('tags', 'security').map((node) => node.data?.url)).toEqual([
      '/products/security',
      '/resource-center/security-post',
    ]);
    expect(tree.findBy('tags', 'security', { under: '/products' })).toEqual([
      tree.get('/products/security'),
    ]);
  });

  it('sorts siblings once and wraps next/previous by default', () => {
    const tree = createContentTree([
      createFrontmatter('/'),
      createFrontmatter('/a', { order: 2 }),
      createFrontmatter('/b', { order: 1 }),
    ], {
      sortSiblings: (a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0),
    });

    const a = tree.get('/a');
    const b = tree.get('/b');

    expect(tree.root.children().map((node) => node.data?.url)).toEqual(['/b', '/a']);
    expect(a?.next()?.data?.url).toBe('/b');
    expect(b?.previous()?.data?.url).toBe('/a');
    expect(a?.next({ wrap: false })).toBeNull();
  });

  it('supports explicit duplicate URL policies', () => {
    const first = createFrontmatter('/same', { title: 'first' });
    const last = createFrontmatter('/same', { title: 'last' });

    expect(() => createContentTree([first, last])).toThrow(/Duplicate normalized content path/);
    expect(createContentTree([first, last], {
      duplicateUrl: 'first-wins',
    }).getByUrl('/same')?.data?.title).toBe('first');
    expect(createContentTree([first, last], {
      duplicateUrl: 'last-wins',
    }).getByUrl('/same')?.data?.title).toBe('last');
  });

  it('does not mutate input data or cached child order when callers sort', () => {
    const input = [
      createFrontmatter('/'),
      createFrontmatter('/b'),
      createFrontmatter('/a'),
    ];
    const originalUrls = input.map((item) => item.url);
    const tree = createContentTree(input);
    const cachedChildren = tree.root.children();

    expect(input.map((item) => item.url)).toEqual(originalUrls);
    expect(tree.root.children()).toBe(cachedChildren);
    expect(tree.root.children({
      sort: (a, b) => String(a.data?.url).localeCompare(String(b.data?.url)),
    }).map((node) => node.data?.url)).toEqual(['/a', '/b']);
    expect(tree.root.children().map((node) => node.data?.url)).toEqual(['/b', '/a']);
  });

  it('locks public node fields after construction while preserving lazy reads', () => {
    const tree = createContentTree([
      createFrontmatter('/'),
      createFrontmatter('/docs/page'),
    ]);
    const node = tree.get('/docs/page');

    expect(Object.getOwnPropertyDescriptor(node, 'url')?.writable).toBe(false);
    expect(Object.getOwnPropertyDescriptor(node, 'data')?.writable).toBe(false);
    expect(Object.isFrozen(node?.children())).toBe(true);
    expect(node?.descendants()).toEqual([]);
    expect(tree.root.descendants().map((child) => child.data?.url)).toEqual([
      '/docs/page',
    ]);
  });
});
