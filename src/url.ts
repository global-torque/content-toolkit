/**
 * Lossless path, query, and fragment parts of a content reference.
 *
 * @public
 */
export interface ContentPathReference {
  /** Undecoded text before the first query or fragment delimiter. */
  readonly path: string;
  /** Query including `?`, or an empty string. */
  readonly query: string;
  /** Fragment including `#`, or an empty string. */
  readonly fragment: string;
}

/**
 * Stable context supplied to a host path-segment transform.
 *
 * @public
 */
export interface ContentPathSegmentContext {
  /** Zero-based segment index. */
  readonly index: number;
  /** Frozen original non-empty path segments. */
  readonly segments: readonly string[];
}

/**
 * Host policy for transforming exactly one safe path segment.
 *
 * @public
 */
export type ContentPathSegmentTransform = (
  segment: string,
  context: ContentPathSegmentContext,
) => string;

/**
 * Options for formatting only the path portion of a content reference.
 *
 * @public
 */
export interface FormatContentPathOptions {
  /** Called only for non-empty path segments; query and fragment are never passed. */
  transformSegment?: ContentPathSegmentTransform;
  /** Controls the trailing slash without changing query or fragment text. */
  trailingSlash?: 'preserve' | 'remove' | 'ensure';
}

/**
 * Split a path reference without decoding or normalizing any component.
 *
 * @public
 */
export function splitContentPathReference(value: string): ContentPathReference {
  const fragmentIndex = value.indexOf('#');
  const beforeFragment =
    fragmentIndex === -1 ? value : value.slice(0, fragmentIndex);
  const fragment = fragmentIndex === -1 ? '' : value.slice(fragmentIndex);
  const queryIndex = beforeFragment.indexOf('?');

  return Object.freeze({
    path:
      queryIndex === -1 ? beforeFragment : beforeFragment.slice(0, queryIndex),
    query: queryIndex === -1 ? '' : beforeFragment.slice(queryIndex),
    fragment,
  });
}

function containsControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) {
      return true;
    }
  }
  return false;
}

function assertSegment(value: string, transformed: boolean): void {
  const decodedDots = transformed ? value.replace(/%2e/gi, '.') : value;
  if (
    /[\\/?#]/.test(value) ||
    containsControlCharacter(value) ||
    decodedDots === '.' ||
    decodedDots === '..'
  ) {
    throw new TypeError(
      'A content path segment transform must return one safe path segment.',
    );
  }
}

/**
 * Format only the path portion of a relative or root-absolute content reference.
 * Unicode and valid percent escapes are preserved byte-for-byte unless a host
 * explicitly supplies a segment transform.
 *
 * @public
 */
export function formatContentPath(
  value: string,
  options: FormatContentPathOptions = {},
): string {
  const transformSegment = options.transformSegment;
  const trailingSlash = options.trailingSlash ?? 'preserve';
  if (
    transformSegment !== undefined &&
    typeof transformSegment !== 'function'
  ) {
    throw new TypeError('transformSegment must be a function when provided.');
  }
  if (!['preserve', 'remove', 'ensure'].includes(trailingSlash)) {
    throw new TypeError('trailingSlash must be preserve, remove, or ensure.');
  }
  const { path, query, fragment } = splitContentPathReference(value);
  const leadingSlash = path.startsWith('/');
  const hadTrailingSlash = path.length > 1 && path.endsWith('/');
  const rawSegments = path.split('/').filter((segment) => segment.length > 0);
  const segmentContext = Object.freeze([...rawSegments]);
  const segments = rawSegments
    .map((segment, index) => {
      const transformed = transformSegment
        ? transformSegment(segment, {
            index,
            segments: segmentContext,
          })
        : segment;
      if (typeof transformed !== 'string') {
        throw new TypeError(
          'A content path segment transform must return a string.',
        );
      }
      assertSegment(transformed, transformSegment !== undefined);
      return transformed;
    })
    .filter((segment) => segment.length > 0);

  let formattedPath = `${leadingSlash ? '/' : ''}${segments.join('/')}`;
  if (!formattedPath && leadingSlash) {
    formattedPath = '/';
  }

  const shouldTrail =
    trailingSlash === 'ensure' ||
    (trailingSlash === 'preserve' && hadTrailingSlash);

  if (formattedPath && formattedPath !== '/') {
    formattedPath = formattedPath.replace(/\/+$/, '');
    if (shouldTrail) {
      formattedPath += '/';
    }
  }

  return `${formattedPath}${query}${fragment}`;
}
