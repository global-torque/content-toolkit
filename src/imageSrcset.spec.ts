import { describe, expect, it } from 'vitest';

import { createImageSrcset } from './imageSrcset';

describe('createImageSrcset', () => {
  it('uses host variants and URL policy in the supplied order', () => {
    const variants = Object.freeze([
      Object.freeze({ name: 'compact', width: 320 }),
      Object.freeze({ name: 'wide', width: 960 }),
    ] as const);

    expect(
      createImageSrcset({
        variants,
        buildUrl: ({ name }) => `https://images.example/${name}`,
      }),
    ).toBe(
      'https://images.example/compact 320w, https://images.example/wide 960w',
    );
  });

  it('omits unavailable variants and returns undefined when no URL is built', () => {
    expect(
      createImageSrcset({
        variants: [{ name: 'only', width: 640 }],
        buildUrl: () => undefined,
      }),
    ).toBeUndefined();
  });

  it('rejects invalid and duplicate widths', () => {
    expect(() =>
      createImageSrcset({
        variants: [{ name: 'bad', width: 0 }],
        buildUrl: () => '/bad',
      }),
    ).toThrow(TypeError);
    expect(() =>
      createImageSrcset({
        variants: [
          { name: 'a', width: 320 },
          { name: 'b', width: 320 },
        ],
        buildUrl: ({ name }) => `/${name}`,
      }),
    ).toThrow(/unique/);
  });

  it('reads each width once before invoking a mutating URL builder', () => {
    const mutable = { name: 'mutable', width: 320 };
    expect(
      createImageSrcset({
        variants: [mutable],
        buildUrl: () => {
          mutable.width = 0;
          return '/mutable';
        },
      }),
    ).toBe('/mutable 320w');

    let widthReads = 0;
    const varying = {
      name: 'varying',
      get width() {
        widthReads += 1;
        return widthReads === 1 ? 640 : 0;
      },
    };
    expect(
      createImageSrcset({ variants: [varying], buildUrl: () => '/varying' }),
    ).toBe('/varying 640w');
    expect(widthReads).toBe(1);
  });

  it('rejects URLs that cannot survive image-candidate parsing', () => {
    for (const unsafe of [
      '/img/hero shot.jpg',
      '/img/hero\tshot.jpg',
      '/img/hero\nshot.jpg',
      '/img/hero\fshot.jpg',
      '/img/hero\rshot.jpg',
      '/img/small.jpg,',
      ',/img/small.jpg',
      ',',
    ]) {
      expect(() =>
        createImageSrcset({
          variants: [{ name: 'only', width: 320 }],
          buildUrl: () => unsafe,
        }),
      ).toThrow(TypeError);
    }

    expect(() =>
      createImageSrcset({
        variants: [
          { name: 'small', width: 320 },
          { name: 'large', width: 960 },
        ],
        buildUrl: ({ name }) => `/img/hero shot-${name}.jpg`,
      }),
    ).toThrow(/must not contain whitespace/);
  });

  it('keeps internal commas and surrounding whitespace usable', () => {
    expect(
      createImageSrcset({
        variants: [
          { name: 'small', width: 320 },
          { name: 'large', width: 960 },
        ],
        buildUrl: ({ name, width }) =>
          `https://images.example/upload/w_${String(width)},c_fill/${name}.jpg`,
      }),
    ).toBe(
      'https://images.example/upload/w_320,c_fill/small.jpg 320w, ' +
        'https://images.example/upload/w_960,c_fill/large.jpg 960w',
    );

    expect(
      createImageSrcset({
        variants: [{ name: 'padded', width: 320 }],
        buildUrl: () => '  /img/padded.jpg  ',
      }),
    ).toBe('/img/padded.jpg 320w');

    expect(
      createImageSrcset({
        variants: [{ name: 'blank', width: 320 }],
        buildUrl: () => '   ',
      }),
    ).toBeUndefined();
  });
});
