import { getFilerImageSrcset } from './filerImage.js';
import { transliteratedUrlFormat, urlFormat } from './url.js';

export interface FrontmatterLike extends Record<string, unknown> {
  url?: string;
  rawUrl?: string;
  slug?: string;
  summary?: string;
  description?: string;
  image?: string;
  srcset?: string;
  cover?: {
    image?: string;
    srcset?: string;
  };
}

export interface PageDataLike {
  frontmatter: FrontmatterLike;
  relativePath?: string;
  url?: string;
  filePath?: string;
  src?: string;
}

export type ImageSrcsetResolver = (imageUrl?: string) => string | undefined;

export interface NormalizeFrontmatterOptions {
  defaultImage?: string;
  ensureSlug?: boolean;
  ensureSummary?: boolean;
  imageSrcset?: boolean | ImageSrcsetResolver;
  legacyCoverImage?: 'reject' | 'map-to-top-level';
  preserveRawUrl?: boolean;
  summaryLength?: number;
  urlFormatter?: (url: string) => string;
}

export type NormalizedFrontmatter<TFrontmatter extends FrontmatterLike = FrontmatterLike> =
  Omit<TFrontmatter, 'url' | 'image'> & {
    url: string;
    image: string;
    srcset?: string;
    rawUrl?: string;
    slug?: string;
    summary?: string;
  };

const DEFAULT_IMAGE = '/images/sharing.png';
const DEFAULT_SUMMARY_LENGTH = 200;

export const legacyCoverNormalizeFrontmatterOptions: NormalizeFrontmatterOptions = {
  ensureSlug: true,
  imageSrcset: false,
  legacyCoverImage: 'map-to-top-level',
  preserveRawUrl: true,
  urlFormatter: transliteratedUrlFormat,
};

function hasOwn(object: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function resolveImageSrcset(
  imageUrl: string | undefined,
  resolver: boolean | ImageSrcsetResolver | undefined,
) {
  if (typeof resolver === 'function') {
    return resolver(imageUrl);
  }

  if (resolver === true) {
    return getFilerImageSrcset(imageUrl);
  }

  return undefined;
}

function isLegacyCoverFrontmatter(
  cover: unknown,
): cover is NonNullable<FrontmatterLike['cover']> {
  return typeof cover === 'object' && cover !== null;
}

function mapLegacyCoverImage(frontmatter: FrontmatterLike) {
  if (!hasOwn(frontmatter, 'cover')) {
    return;
  }

  const cover = frontmatter.cover;
  if (!isLegacyCoverFrontmatter(cover)) {
    delete frontmatter.cover;
    return;
  }

  if (!hasOwn(frontmatter, 'image') && cover.image) {
    frontmatter.image = cover.image;
  }

  if (!hasOwn(frontmatter, 'srcset') && cover.srcset) {
    frontmatter.srcset = cover.srcset;
  }

  delete frontmatter.cover;
}

function stripFrontmatter(source: string): string {
  return source.replace(/^---[^\S\r\n]*\r?\n[\s\S]*?\r?\n---[^\S\r\n]*(?:\r?\n|$)/, '');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '');
}

function stripHtmlAndMarkdown(value: string): string {
  return stripMarkdown(stripHtml(value));
}

function getSummary(value: string, length = DEFAULT_SUMMARY_LENGTH): string {
  return stripHtmlAndMarkdown(value.replaceAll('"', "'").slice(0, length)).trim();
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function getSlugFromURL(url: string) {
  return url.split('/')?.pop()?.replace('.html', '').trim();
}

export function getImage(img?: string, defaultImage = DEFAULT_IMAGE) {
  return img === undefined || img === '' ? defaultImage : img;
}

export function getUrl(
  pageData: PageDataLike,
  formatter: (url: string) => string = urlFormat,
) {
  const rawUrl = pageData.relativePath
    ? `/${pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '')}`
    : (pageData.url ?? '');

  return formatter(rawUrl);
}

export function normalizeFrontmatter<TFrontmatter extends FrontmatterLike>(
  pageData: PageDataLike & { frontmatter: TFrontmatter },
  options: NormalizeFrontmatterOptions = {},
): NormalizedFrontmatter<TFrontmatter> {
  const resolvedOptions: Required<Pick<
    NormalizeFrontmatterOptions,
    'defaultImage' | 'ensureSlug' | 'ensureSummary' | 'legacyCoverImage' | 'preserveRawUrl' | 'summaryLength' | 'urlFormatter'
  >> & Pick<NormalizeFrontmatterOptions, 'imageSrcset'> = {
    defaultImage: DEFAULT_IMAGE,
    ensureSlug: true,
    ensureSummary: false,
    imageSrcset: false,
    legacyCoverImage: 'reject',
    preserveRawUrl: true,
    summaryLength: DEFAULT_SUMMARY_LENGTH,
    urlFormatter: urlFormat,
    ...options,
  };
  const { frontmatter } = pageData;

  if (hasOwn(frontmatter, 'cover')) {
    if (resolvedOptions.legacyCoverImage === 'reject') {
      throw new Error('Frontmatter "cover" is not supported. Use top-level image/srcset instead.');
    }

    mapLegacyCoverImage(frontmatter);
  }

  const rawUrl = pageData.url
    ?? (pageData.relativePath ? `/${pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '')}` : undefined);

  frontmatter.url = getUrl(pageData, resolvedOptions.urlFormatter);

  if (
    resolvedOptions.preserveRawUrl
    && !hasOwn(frontmatter, 'rawUrl')
    && rawUrl
  ) {
    frontmatter.rawUrl = rawUrl;
  }

  if (
    resolvedOptions.ensureSlug
    && !hasOwn(frontmatter, 'slug')
  ) {
    frontmatter.slug = getSlugFromURL(frontmatter.url);
  }

  if (
    resolvedOptions.ensureSummary
    && !hasOwn(frontmatter, 'summary')
  ) {
    const markdownSource = getString(pageData.src);
    const sourceFallback = markdownSource ? stripFrontmatter(markdownSource) : '';
    const description = getString(frontmatter.description);
    const summarySource = description.trim() ? description : sourceFallback;

    frontmatter.summary = getSummary(summarySource, resolvedOptions.summaryLength);
  }

  const image = getImage(
    frontmatter.image,
    resolvedOptions.defaultImage,
  );
  const generatedSrcset = resolveImageSrcset(image, resolvedOptions.imageSrcset);

  frontmatter.image = image;

  if (generatedSrcset || frontmatter.srcset) {
    frontmatter.srcset = generatedSrcset ?? frontmatter.srcset;
  }

  return frontmatter as NormalizedFrontmatter<TFrontmatter>;
}
