# @global-torque/content-toolkit

> **Public prerelease:** `0.2.0-beta.8` is the first npm-published candidate.
> Pin the exact version while the 0.2 contract remains in beta.

Framework-independent, immutable helpers for content records, trees, paths,
sorting, filtering, and image srcsets. Hosts own article fields, slug policy,
transliteration, legacy migrations, image services, and presentation.

## Public contract

The package understands only this record:

```ts
interface ContentRecord {
  readonly url: string;
  readonly rawUrl?: string;
  readonly draft?: boolean;
}
```

Applications extend it with their own fields. No image, article, product, or
folder taxonomy is required or supplied by this package.

## Install

```sh
pnpm add @global-torque/content-toolkit@0.2.0-beta.8
```

## Normalize content data

```ts
import { normalizeFrontmatter } from '@global-torque/content-toolkit/pageData';
import { formatContentPath } from '@global-torque/content-toolkit/url';

const input = Object.freeze({
  relativePath: 'guides/Overview.md',
  frontmatter: Object.freeze({ title: 'Overview' }),
});

const record = normalizeFrontmatter(input, {
  formatPath: (path) =>
    formatContentPath(path, {
      transformSegment: (segment) => segment.toLowerCase(),
    }),
});
```

Normalization deeply clones and freezes structured metadata, derives only `url`
and optional `rawUrl`, and never parses Markdown, maps legacy fields, chooses an
image, or mutates input. Structured metadata may contain primitives, dates,
arrays, and plain objects; functions, accessors, and class instances are
rejected. `NormalizeFrontmatterOptions.formatPath` must return a non-empty
content-reference string and may preserve a query or fragment. By contrast,
`ContentTreeOptions.normalizePath` must return a canonical root-absolute tree
path with no query, fragment, duplicate separators, trailing slash, boundary
whitespace, or dot segments.

This JavaScript example is executed from the packed README in both npm and pnpm
clean rooms:

```js clean-room
import assert from 'node:assert/strict';
import { normalizeFrontmatter } from '@global-torque/content-toolkit/pageData';

const input = Object.freeze({
  relativePath: 'guides/Overview.md',
  frontmatter: Object.freeze({ title: 'Overview' }),
});
const record = normalizeFrontmatter(input);

assert.deepEqual(record, { title: 'Overview', url: '/guides/Overview' });
assert.equal(Object.isFrozen(record), true);
assert.equal(input.frontmatter.title, 'Overview');
```

## Content tree

```ts
import {
  type ContentRecord,
  createContentTree,
  DuplicateContentPathError,
  MissingContentPathError,
} from '@global-torque/content-toolkit/pages';

interface ArticleRecord extends ContentRecord {
  title: string;
  tags?: readonly string[];
}

const tree = createContentTree<ArticleRecord>(records, {
  duplicatePath: 'error',
  indexPage: 'collapse',
  indexKeys: ['tags'],
});

tree.require('/guides');
```

Tree records and returned collections are detached/frozen. Missing input paths
and required lookups use `MissingContentPathError`; normalized collisions use
`DuplicateContentPathError`. Duplicate policies are `error`, `first-wins`, and
`last-wins`. Index pages collapse by default; use `indexPage: 'preserve'` when
`/docs` and `/docs/index` are intentionally distinct.

## Image srcsets

```ts
import { createImageSrcset } from '@global-torque/content-toolkit/image-srcset';

const srcset = createImageSrcset({
  variants: [
    { name: 'small', width: 320 },
    { name: 'large', width: 960 },
  ],
  buildUrl: ({ name }) => imageService.url(source, name),
});
```

Hosts choose variant names, positive unique widths, hostnames, and URLs. The
toolkit validates width descriptors and omits variants whose URL builder returns
an empty value; it does not choose image-service policy.

## Public imports

- `@global-torque/content-toolkit`
- `@global-torque/content-toolkit/allData`
- `@global-torque/content-toolkit/image-srcset`
- `@global-torque/content-toolkit/pageData`
- `@global-torque/content-toolkit/pages`
- `@global-torque/content-toolkit/types`
- `@global-torque/content-toolkit/url`

The generated [API reference](docs/api/content-toolkit.md) and committed
[API report](etc/content-toolkit.api.md) describe the complete reviewed surface.

## Breaking migration from 0.1

- Replace the former frontmatter aliases with an app-owned interface extending
  `ContentRecord`.
- Replace the old URL formatter with `formatContentPath` plus an app-owned
  segment transform.
- Move transliteration and private folder removal into the host.
- Replace the old image-service helper with `createImageSrcset` and a host URL
  builder.
- Use the return value of `normalizeFrontmatter`; it no longer mutates page data
  or supplies slug, summary, image, srcset, or legacy-cover behavior.
- Rename the tree option `duplicateUrl` to `duplicatePath`.

## Non-goals

The package does not read files, parse Markdown/frontmatter syntax, render UI,
read environment variables, implement a CMS/image service, or encode any
product taxonomy.

## Verification and support

Run `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`,
`pnpm run test:coverage`, `pnpm run build`, and `pnpm run api:check` in this
package. Security reports use GitHub private vulnerability reporting. Public
support and compatibility begin only after an approved immutable release.
