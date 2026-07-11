import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

import {
  filterByArrayValue,
  filterByKeyValue,
  filterByNotKeyValue,
  filterPages,
  filterPagesNot,
  filterSingle,
  getPages,
  sortByDate,
  sortByOrderAscending,
  sortByOrderDescending,
  sortByPublishDateDescending,
} from './allData';
import { normalizeFrontmatter } from './pageData';

interface Item {
  url: string;
  draft?: boolean;
  order?: number;
  publishDate?: string;
  score?: number;
  tags?: readonly string[];
  kind?: 'a' | 'b';
}

const item = (url: string, options: Omit<Item, 'url'> = {}): Item => ({
  url,
  ...options,
});

describe('content collections', () => {
  it('does not mutate frozen inputs and returns frozen collections', () => {
    const input = Object.freeze([
      Object.freeze(item('/b', { order: 2 })),
      Object.freeze(item('/a', { order: 1 })),
    ]);

    const sorted = sortByOrderAscending(input);
    expect(sorted.map(({ url }) => url)).toEqual(['/a', '/b']);
    expect(input.map(({ url }) => url)).toEqual(['/b', '/a']);
    expect(Object.isFrozen(sorted)).toBe(true);
    expect(sortByOrderDescending(input).map(({ url }) => url)).toEqual([
      '/b',
      '/a',
    ]);
  });

  it('reads draft only from an own data descriptor without invoking accessors', () => {
    let inheritedReads = 0;
    const prototype = {} as Record<string, unknown>;
    Object.defineProperty(prototype, 'draft', {
      get() {
        inheritedReads += 1;
        return true;
      },
    });
    const visible = Object.assign(Object.create(prototype) as Item, {
      url: '/visible',
    });
    expect(getPages([visible])).toEqual([visible]);
    expect(inheritedReads).toBe(0);

    const accessorDraft = item('/accessor');
    Object.defineProperty(accessorDraft, 'draft', {
      enumerable: true,
      get() {
        inheritedReads += 1;
        return true;
      },
    });
    expect(() => getPages([accessorDraft])).toThrow(TypeError);
    expect(inheritedReads).toBe(0);
    expect(() =>
      getPages([{ url: '/malformed', draft: 'true' } as never]),
    ).toThrow(TypeError);
  });

  it('keeps equal values stable and always places invalid dates last', () => {
    const input = [
      item('/invalid', { publishDate: 'invalid' }),
      item('/first', { publishDate: '1960-01-01' }),
      item('/same-a', { publishDate: '2026-01-01' }),
      item('/same-b', { publishDate: '2026-01-01' }),
      item('/missing'),
    ];

    expect(sortByPublishDateDescending(input).map(({ url }) => url)).toEqual([
      '/same-a',
      '/same-b',
      '/first',
      '/invalid',
      '/missing',
    ]);
    expect(
      sortByDate(input, 'publishDate', 'ascending').map(({ url }) => url),
    ).toEqual(['/first', '/same-a', '/same-b', '/invalid', '/missing']);
  });

  it('sorts Date instances by intrinsic time without reading hostile own methods', () => {
    const later = new Date('2026-01-02T00:00:00.000Z');
    let reads = 0;
    Object.defineProperty(later, 'getTime', {
      enumerable: true,
      get() {
        reads += 1;
        throw new Error('must not execute');
      },
    });
    const earlier = new Date('2026-01-01T00:00:00.000Z');
    const input = [{ value: later }, { value: earlier }];

    expect(sortByDate(input, 'value', 'ascending')).toEqual([
      input[1],
      input[0],
    ]);
    expect(reads).toBe(0);
  });

  it('sorts genuine cross-realm dates in both directions', () => {
    const newer = runInNewContext(
      `new Date('2026-01-02T00:00:00.000Z')`,
    ) as Date;
    const older = new Date('2026-01-01T00:00:00.000Z');
    const input = [{ value: newer }, { value: older }];

    expect(sortByDate(input, 'value', 'ascending')).toEqual([
      input[1],
      input[0],
    ]);
    expect(sortByDate(input, 'value', 'descending')).toEqual(input);
  });

  it('sorts immutable dates produced by the package as valid dates', () => {
    const normalized = normalizeFrontmatter({
      url: '/newer',
      frontmatter: {
        publishDate: new Date('2026-01-02T00:00:00.000Z'),
      },
    });
    const newer = normalized.publishDate;
    const older = new Date('2026-01-01T00:00:00.000Z');
    const input = [{ value: newer }, { value: older }];

    expect(sortByDate(input, 'value', 'ascending')).toEqual([
      input[1],
      input[0],
    ]);
    expect(sortByDate(input, 'value', 'descending')).toEqual(input);
    expect(sortByPublishDateDescending([normalized])).toEqual([normalized]);
  });

  it('applies typed scalar and array filters to detached page lists', () => {
    const input: readonly Item[] = [
      item('/a', { kind: 'a', tags: ['one'] }),
      item('/b', { kind: 'b', tags: ['two'], draft: true }),
      item('/c', { kind: 'a', tags: ['two'] }),
    ];

    expect(
      getPages(input, [filterByKeyValue<Item, 'kind'>('kind', 'a')]).map(
        ({ url }) => url,
      ),
    ).toEqual(['/a', '/c']);
    expect(
      getPages(input, [filterByArrayValue<Item, 'tags'>('tags', 'two')]).map(
        ({ url }) => url,
      ),
    ).toEqual(['/c']);
    expect(
      Object.isFrozen(filterByKeyValue<Item, 'kind'>('kind', 'a')(input)),
    ).toBe(true);
    expect(
      Object.isFrozen(filterByNotKeyValue<Item, 'kind'>('kind', 'a')(input)),
    ).toBe(true);
    expect(
      Object.isFrozen(filterByArrayValue<Item, 'tags'>('tags', 'two')(input)),
    ).toBe(true);
  });

  it('uses SameValueZero consistently for scalar equality and inequality', () => {
    const input = [
      item('/nan', { score: Number.NaN }),
      item('/zero', { score: 0 }),
      item('/one', { score: 1 }),
    ];

    expect(filterByKeyValue<Item, 'score'>('score', Number.NaN)(input)).toEqual(
      [input[0]],
    );
    expect(
      filterByNotKeyValue<Item, 'score'>('score', Number.NaN)(input),
    ).toEqual([input[1], input[2]]);
    expect(filterByKeyValue<Item, 'score'>('score', -0)(input)).toEqual([
      input[1],
    ]);
  });

  it('returns frozen empty collections for absent optional input', () => {
    const filtered = filterPages<Item, 'kind'>(undefined, 'kind', 'a');
    const excluded = filterPagesNot<Item, 'kind'>(undefined, 'kind', 'a');

    expect(filtered).toEqual([]);
    expect(excluded).toEqual([]);
    expect(Object.isFrozen(filtered)).toBe(true);
    expect(Object.isFrozen(excluded)).toBe(true);
  });

  it('covers optional ordering, date input forms, and convenience filters', () => {
    const input: readonly Item[] = [
      item('/missing-order', { kind: 'a' }),
      item('/ordered', { kind: 'a', order: 2, publishDate: '2026-01-02' }),
      item('/other', { kind: 'b', order: 1, publishDate: '2026-01-01' }),
    ];

    expect(
      getPages(input, [], [sortByOrderAscending]).map(({ url }) => url),
    ).toEqual(['/missing-order', '/other', '/ordered']);
    expect(filterPages(input, 'kind', 'a').map(({ url }) => url)).toEqual([
      '/ordered',
      '/missing-order',
    ]);
    expect(filterPagesNot(input, 'kind', 'a').map(({ url }) => url)).toEqual([
      '/other',
    ]);
    expect(filterSingle(input, 'kind', 'a')?.url).toBe('/ordered');
    expect(filterSingle(input, 'kind', 'missing' as never)).toBeNull();
    expect(filterSingle<Item, 'kind'>(undefined, 'kind', 'a')).toBeNull();
    expect(filterByArrayValue<Item, 'tags'>('tags', 'missing')(input)).toEqual(
      [],
    );

    const mixedDates = [
      { value: new Date('2026-01-03') },
      { value: 0 },
      { value: undefined },
    ];
    expect(sortByDate(mixedDates, 'value', 'descending')).toEqual([
      mixedDates[0],
      mixedDates[1],
      mixedDates[2],
    ]);
  });
});
