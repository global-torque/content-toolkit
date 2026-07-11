import { describe, expect, it, vi } from 'vitest';

import { formatContentPath, splitContentPathReference } from './url';

describe('formatContentPath', () => {
  it('preserves Unicode, percent encoding, query, and fragment by default', () => {
    expect(formatContentPath('/café/%E2%82%AC?next=A%2FB#Héading')).toBe(
      '/café/%E2%82%AC?next=A%2FB#Héading',
    );
  });

  it('calls the host transform for path segments only', () => {
    const transformSegment = vi.fn((segment: string) => segment.toLowerCase());

    expect(
      formatContentPath('/Docs/Page?Case=Keep#Heading', { transformSegment }),
    ).toBe('/docs/page?Case=Keep#Heading');
    expect(transformSegment.mock.calls.map(([segment]) => segment)).toEqual([
      'Docs',
      'Page',
    ]);
  });

  it('supports relative paths, removed segments, and explicit trailing slash policy', () => {
    expect(
      formatContentPath('drafts/Guide/', {
        trailingSlash: 'remove',
        transformSegment: (segment) => (segment === 'drafts' ? '' : segment),
      }),
    ).toBe('Guide');
    expect(formatContentPath('/docs', { trailingSlash: 'ensure' })).toBe(
      '/docs/',
    );
    expect(formatContentPath('/', { transformSegment: () => '' })).toBe('/');
  });

  it('rejects transforms that escape a path segment', () => {
    expect(() =>
      formatContentPath('/safe', {
        transformSegment: () => '../unsafe',
      }),
    ).toThrow(TypeError);
    expect(() =>
      formatContentPath('/safe', {
        transformSegment: () => '..',
      }),
    ).toThrow(TypeError);
    expect(() =>
      formatContentPath('/safe', {
        transformSegment: () => '.',
      }),
    ).toThrow(TypeError);
    for (const unsafe of [
      '..\\admin',
      'a\\b',
      '%2e%2e',
      '%2e.',
      'line\nfeed',
    ]) {
      expect(() =>
        formatContentPath('/safe', {
          transformSegment: () => unsafe,
        }),
      ).toThrow(TypeError);
    }
    expect(
      new URL(formatContentPath('/safe'), 'https://example.test').pathname,
    ).toBe('/safe');
  });

  it('captures host policy once and validates callback return types', () => {
    const options: {
      transformSegment: ((segment: string) => string) | undefined;
      trailingSlash: 'ensure' | 'remove';
    } = {
      trailingSlash: 'ensure',
      transformSegment() {
        options.transformSegment = undefined;
        options.trailingSlash = 'remove';
        return '%2e%2e';
      },
    };
    expect(() => formatContentPath('/safe', options as never)).toThrow(
      TypeError,
    );
    expect(() =>
      formatContentPath('/safe', {
        transformSegment: (() => 123) as never,
      }),
    ).toThrow(/return a string/);
  });

  it('preserves untouched encoded segments while applying no browser canonicalization', () => {
    expect(formatContentPath('/%2e%2e/kept')).toBe('/%2e%2e/kept');
  });

  it('splits suffix boundaries without decoding', () => {
    expect(splitContentPathReference('/a%2Fb?x=%23#part')).toEqual({
      path: '/a%2Fb',
      query: '?x=%23',
      fragment: '#part',
    });
  });
});
