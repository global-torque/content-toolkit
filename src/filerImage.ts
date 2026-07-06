const FILER_PUBLIC_FILE_PATH_REGEXP = /^\/filer-api\/v1\.0\/public\/files\/\d+$/;
const FILER_IMAGE_OFFSET = 100;
const FILER_IMAGE_WIDTHS = {
  small: 311 - FILER_IMAGE_OFFSET,
  medium: 484 - FILER_IMAGE_OFFSET,
  big: 1024 - FILER_IMAGE_OFFSET,
} as const;

export interface FilerImageSrcsetOptions {
  allowedHostnames?: readonly string[];
}

const getPublicFilerUrl = (
  imageUrl?: string,
  options: FilerImageSrcsetOptions = {},
): URL | null => {
  if (!imageUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(imageUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return null;
    }

    if (
      options.allowedHostnames
      && !options.allowedHostnames.includes(parsedUrl.hostname)
    ) {
      return null;
    }

    if (!FILER_PUBLIC_FILE_PATH_REGEXP.test(parsedUrl.pathname)) {
      return null;
    }

    parsedUrl.searchParams.delete('size');

    return parsedUrl;
  } catch {
    return null;
  }
};

const withSize = (imageUrl: URL, size: 'small' | 'medium' | 'big') => {
  const sizedUrl = new URL(imageUrl.toString());
  sizedUrl.searchParams.set('size', size);
  return sizedUrl.toString();
};

export const getFilerImageSrcset = (
  imageUrl?: string,
  options: FilerImageSrcsetOptions = {},
) => {
  const filerUrl = getPublicFilerUrl(imageUrl, options);

  if (!filerUrl) {
    return undefined;
  }

  return [
    `${withSize(filerUrl, 'small')} ${FILER_IMAGE_WIDTHS.small}w`,
    `${withSize(filerUrl, 'medium')} ${FILER_IMAGE_WIDTHS.medium}w`,
    `${withSize(filerUrl, 'big')} ${FILER_IMAGE_WIDTHS.big}w`,
  ].join(', ');
};
