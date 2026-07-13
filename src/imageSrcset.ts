/**
 * Host-defined image variant used to create a width-descriptor srcset.
 *
 * @public
 */
export interface ImageSrcsetVariant<TName extends string = string> {
  /** Host-owned variant identifier passed to the URL builder. */
  readonly name: TName;
  /** Positive unique CSS-pixel width used in the `w` descriptor. */
  readonly width: number;
}

/**
 * Inputs for deterministic srcset construction.
 *
 * @public
 */
export interface CreateImageSrcsetOptions<
  TVariant extends ImageSrcsetVariant = ImageSrcsetVariant,
> {
  /** Ordered host-owned variants. */
  readonly variants: readonly TVariant[];
  /** Build a URL or omit a variant by returning `undefined`. */
  readonly buildUrl: (variant: TVariant, index: number) => string | undefined;
}

/**
 * Build a deterministic width-descriptor srcset from host-owned variants.
 *
 * @public
 */
export function createImageSrcset<
  TVariant extends ImageSrcsetVariant = ImageSrcsetVariant,
>(input: CreateImageSrcsetOptions<TVariant>): string | undefined {
  const { variants, buildUrl } = input;
  const seenWidths = new Set<number>();
  const entries = variants
    .map((variant, index) => {
      const width = variant.width;
      if (!Number.isSafeInteger(width) || width <= 0) {
        throw new TypeError(
          `Image srcset width must be a positive integer: ${String(width)}.`,
        );
      }
      if (seenWidths.has(width)) {
        throw new TypeError(
          `Image srcset widths must be unique: ${String(width)}.`,
        );
      }
      seenWidths.add(width);

      const builtUrl = buildUrl(variant, index);
      if (builtUrl !== undefined && typeof builtUrl !== 'string') {
        throw new TypeError(
          'Image srcset URL builders must return a string or undefined.',
        );
      }
      const url = builtUrl?.trim();
      return url ? `${url} ${String(width)}w` : undefined;
    })
    .filter((entry): entry is string => entry !== undefined);

  return entries.length > 0 ? entries.join(', ') : undefined;
}
