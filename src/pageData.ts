import { createContentSnapshotWithOverrides } from './immutable.js';
import {
  readOptionalBooleanProperty,
  readOptionalStringProperty,
  readOwnDataProperty,
} from './ownDataProperty.js';
import { isPlainRecord } from './runtimeBrands.js';
import type { ContentRecord, DeepReadonly } from './types.js';
import { formatContentPath } from './url.js';

/**
 * Generic structured frontmatter accepted by the normalizer.
 *
 * @public
 */
export interface FrontmatterInput {
  /** Optional frontmatter URL used only when page data has no path. */
  readonly url?: string;
  /** Optional existing source path preserved by the normalizer. */
  readonly rawUrl?: string;
  /** Optional draft marker copied without interpretation. */
  readonly draft?: boolean;
}

/**
 * Framework-neutral page data needed to derive a content URL.
 *
 * @public
 */
export interface PageDataLike<TFrontmatter extends object = FrontmatterInput> {
  /** Structured host frontmatter. */
  readonly frontmatter: TFrontmatter;
  /** Root-relative Markdown path used when no explicit page URL exists. */
  readonly relativePath?: string;
  /** Preferred already-resolved page URL. */
  readonly url?: string;
  /** Optional host file path retained only for structural compatibility. */
  readonly filePath?: string;
}

/**
 * Host-controlled frontmatter normalization policy.
 *
 * @public
 */
export interface NormalizeFrontmatterOptions {
  /** Host-owned public path policy. The default preserves path bytes. */
  formatPath?: (path: string) => string;
  /** Include the unformatted source path when the input did not define rawUrl. */
  preserveRawUrl?: boolean;
}

/**
 * Detached deep-readonly frontmatter with a required public URL.
 *
 * @public
 */
export type NormalizedFrontmatter<TFrontmatter extends object> = {
  readonly [
    TKey in keyof (Omit<TFrontmatter, 'url' | 'rawUrl'> & ContentRecord)
  ]: DeepReadonly<(Omit<TFrontmatter, 'url' | 'rawUrl'> & ContentRecord)[TKey]>;
};

function pathFromRelativeFile(relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/');
  const withoutMarkdownExtension = normalized.replace(/\.md$/i, '');
  const withoutIndex = withoutMarkdownExtension.replace(/(?:^|\/)index$/i, '');
  return `/${withoutIndex}`.replace(/\/{2,}/g, '/') || '/';
}

function getRawPath<TFrontmatter extends object>(
  pageData: PageDataLike<TFrontmatter>,
  frontmatter: TFrontmatter,
): string {
  const pageUrl = readOwnDataProperty(pageData, 'url');
  if (typeof pageUrl === 'string' && pageUrl.trim() !== '') {
    return pageUrl;
  }
  const relativePath = readOwnDataProperty(pageData, 'relativePath');
  if (typeof relativePath === 'string' && relativePath.trim() !== '') {
    return pathFromRelativeFile(relativePath);
  }
  const frontmatterUrl = readOwnDataProperty(frontmatter, 'url');
  if (typeof frontmatterUrl === 'string' && frontmatterUrl.trim() !== '') {
    return frontmatterUrl;
  }

  throw new TypeError(
    'Content frontmatter requires pageData.url, relativePath, or frontmatter.url.',
  );
}

/**
 * Return a detached normalized record without mutating page data or frontmatter.
 *
 * @public
 */
export function normalizeFrontmatter<TFrontmatter extends object>(
  pageData: PageDataLike<TFrontmatter>,
  options: NormalizeFrontmatterOptions = {},
): NormalizedFrontmatter<TFrontmatter> {
  const frontmatter = readOwnDataProperty(pageData, 'frontmatter');
  if (frontmatter === null || typeof frontmatter !== 'object') {
    throw new TypeError('Page data must contain structured frontmatter.');
  }
  if (!isPlainRecord(frontmatter)) {
    throw new TypeError('Page data frontmatter must be a plain object.');
  }
  readOptionalStringProperty(frontmatter, 'url');
  const existingRawUrl = readOptionalStringProperty(frontmatter, 'rawUrl');
  const draft = readOptionalBooleanProperty(frontmatter, 'draft');
  const rawPath = getRawPath(pageData, frontmatter as TFrontmatter);
  const url = (options.formatPath ?? formatContentPath)(rawPath);
  if (typeof url !== 'string' || url.trim() === '') {
    throw new TypeError(
      'Content path formatters must return a non-empty string.',
    );
  }
  const preserveRawUrl = options.preserveRawUrl ?? true;
  const overrides = new Map<string | symbol, unknown>([['url', url]]);

  if (existingRawUrl !== undefined) {
    overrides.set('rawUrl', existingRawUrl);
  } else if (preserveRawUrl && rawPath !== url) {
    overrides.set('rawUrl', rawPath);
  }
  if (draft !== undefined) {
    overrides.set('draft', draft);
  }

  return createContentSnapshotWithOverrides(
    frontmatter as TFrontmatter,
    overrides,
  ) as NormalizedFrontmatter<TFrontmatter>;
}
