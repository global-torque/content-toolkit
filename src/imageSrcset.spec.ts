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
});
