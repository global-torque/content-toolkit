import { describe, expect, it } from 'vitest';

import {
  legacyCoverNormalizeFrontmatterOptions,
  normalizeFrontmatter,
} from './pageData';
import { getFilerImageSrcset } from './filerImage';
import { urlFormat } from './url';

describe('normalizeFrontmatter', () => {
  it('normalizes top-level image input', () => {
    const frontmatter = normalizeFrontmatter({
      url: '/resource-center/example.html',
      frontmatter: {
        title: 'Example',
        image: '/images/blog/example.webp',
      },
    }, {
      imageSrcset: getFilerImageSrcset,
    });

    expect(frontmatter.image).toBe('/images/blog/example.webp');
    expect(frontmatter.slug).toBe('example');
    expect(frontmatter.rawUrl).toBe('/resource-center/example.html');
  });

  it('rejects deprecated nested image frontmatter', () => {
    const frontmatter = {
      image: '/images/blog/example.webp',
      cover: '/images/blog/deprecated.webp',
    } as never;

    expect(() => normalizeFrontmatter({
      url: '/resource-center/example.html',
      frontmatter,
    })).toThrow(
      'Frontmatter "cover" is not supported. Use top-level image/srcset instead.',
    );
  });

  it('maps legacy cover image fields only when explicitly configured', () => {
    const frontmatter = normalizeFrontmatter({
      relativePath: 'ru/путь/страница.md',
      frontmatter: {
        title: 'Legacy Example',
        cover: {
          image: '/images/legacy-cover.webp',
          srcset: '/images/legacy-cover-small.webp 320w',
        },
      },
    }, legacyCoverNormalizeFrontmatterOptions);

    expect(frontmatter.url).toBe('/ru/put/stranitsa');
    expect(frontmatter.image).toBe('/images/legacy-cover.webp');
    expect(frontmatter.srcset).toBe('/images/legacy-cover-small.webp 320w');
    expect('cover' in frontmatter).toBe(false);
  });

  it('preserves explicit top-level srcset when generation is disabled', () => {
    const frontmatter = normalizeFrontmatter({
      relativePath: 'products/internal/investor-portal/investor-portal.md',
      url: '/products/internal/investor-portal/investor-portal.html',
      frontmatter: {
        image: '/images/blog/example.webp',
        srcset: '/images/blog/example-small.webp 320w',
      },
    }, {
      imageSrcset: false,
      urlFormatter: (url) => urlFormat(url, {
        removeDuplicateSegments: true,
        removeFolders: ['internal'],
      }),
    });

    expect(frontmatter.url).toBe('/products/investor-portal');
    expect(frontmatter.image).toBe('/images/blog/example.webp');
    expect(frontmatter.srcset).toBe('/images/blog/example-small.webp 320w');
  });

  it('uses the default image and generated top-level srcset when available', () => {
    const frontmatter = normalizeFrontmatter({
      url: '/products/example.html',
      frontmatter: {
        image: 'https://assets.example.test/filer-api/v1.0/public/files/123?size=big',
      },
    }, {
      imageSrcset: getFilerImageSrcset,
    });

    expect(frontmatter.image).toContain('/filer-api/v1.0/public/files/123');
    expect(frontmatter.srcset).toContain('size=small');
    expect(frontmatter.srcset).toContain('211w');
    expect(frontmatter.srcset).toContain('924w');
  });

  it('falls back to the configured default image', () => {
    const frontmatter = normalizeFrontmatter({
      url: '/empty.html',
      frontmatter: {},
    }, {
      defaultImage: '/images/default.webp',
    });

    expect(frontmatter.image).toBe('/images/default.webp');
  });
});
