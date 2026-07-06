import { describe, expect, it } from 'vitest';

import {
  sortByOrderAscending,
  sortByOrderDescending,
  sortByPublishDateDescending,
} from './allData';

const item = (url: string, order?: number, publishDate?: string) => ({
  url,
  image: '/image.webp',
  order,
  publishDate,
});

describe('content sorting', () => {
  it('sorts order ascending and descending explicitly', () => {
    expect(sortByOrderAscending([
      item('/b', 2),
      item('/a', 1),
    ]).map((entry) => entry.url)).toEqual(['/a', '/b']);

    expect(sortByOrderDescending([
      item('/a', 1),
      item('/b', 2),
    ]).map((entry) => entry.url)).toEqual(['/b', '/a']);
  });

  it('sorts publish date descending and puts invalid dates last', () => {
    expect(sortByPublishDateDescending([
      item('/missing', 0, ''),
      item('/old', 0, '2024-01-01'),
      item('/new', 0, '2026-01-01'),
    ]).map((entry) => entry.url)).toEqual(['/new', '/old', '/missing']);
  });
});
