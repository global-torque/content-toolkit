import { describe, expect, it } from 'vitest';

import { transliteratedUrlFormat, urlFormat } from './url';

describe('urlFormat', () => {
  it('keeps generic Latin paths stable while lowercasing and sanitizing', () => {
    expect(urlFormat('/Already Hyphenated/Page Title')).toBe('/already-hyphenated/page-title');
  });

  it('transliterates Cyrillic paths for readable slugs', () => {
    expect(transliteratedUrlFormat('/наши-ашрамы-йоги')).toBe('/nashi-ashrami-yogi');
  });

  it('lets consumers provide virtual folders and duplicate segment policy', () => {
    expect(urlFormat('/products/internal/investor-portal/investor-portal', {
      removeDuplicateSegments: true,
      removeFolders: ['internal'],
    })).toBe('/products/investor-portal');
    expect(urlFormat('/docs/security/NIST 800 63B', {
      removeFolders: ['docs'],
    })).toBe('/security/nist-800-63b');
  });

  it('supports custom URL strategy options', () => {
    expect(urlFormat('/Docs/Private/My Page', {
      removeFolders: ['Private'],
      removeDuplicateSegments: true,
    })).toBe('/docs/my-page');
  });
});
