# @global-torque/content-toolkit

Framework-independent content utilities for Global Torque VitePress and static
content consumers.

This package combines the former `content-types` contracts and `content-core`
helpers into one public package.

## Install

```sh
pnpm add @global-torque/content-toolkit
```

Before npm publication, pinned GitHub bridge installs may use:

```json
{
  "dependencies": {
    "@global-torque/content-toolkit": "github:global-torque/content-toolkit#master"
  }
}
```

## Usage

```ts
import {
  normalizeFrontmatter,
} from '@global-torque/content-toolkit/pageData';
import { urlFormat } from '@global-torque/content-toolkit/url';

const frontmatter = normalizeFrontmatter(pageData, {
  urlFormatter: (url) => urlFormat(url, {
    removeDuplicateSegments: true,
    removeFolders: ['drafts'],
  }),
});
```

Summary generation is opt-in. When `ensureSummary: true` is passed, the
normalizer uses `frontmatter.description` first. It falls back to `pageData.src`
only when that source is present, and strips leading YAML frontmatter before
creating the summary.

Legacy content that still receives nested `cover.image` can opt in explicitly:

```ts
import {
  legacyCoverNormalizeFrontmatterOptions,
  normalizeFrontmatter,
} from '@global-torque/content-toolkit/pageData';

const frontmatter = normalizeFrontmatter(pageData, legacyCoverNormalizeFrontmatterOptions);
```

The default normalized public shape uses top-level `image` and optional `srcset`.
Nested `cover` input is rejected unless `legacyCoverImage: 'map-to-top-level'`
is passed. Product-specific URL cleanup belongs in the host app or private
adapter; this package only exposes generic formatting options.

## Exports

- `@global-torque/content-toolkit`
- `@global-torque/content-toolkit/allData`
- `@global-torque/content-toolkit/filerImage`
- `@global-torque/content-toolkit/pageData`
- `@global-torque/content-toolkit/pages`
- `@global-torque/content-toolkit/types`
- `@global-torque/content-toolkit/url`

The package exposes built `dist` artifacts only. Source file paths and wildcard
subpaths are not public API.

## Support And Compatibility

- Runtime: plain TypeScript, no Vue, Pinia, VitePress app config, browser env
  reads, investment packages, or app route ownership.
- License: MIT.
- Public source: https://github.com/global-torque/content-toolkit.
- Security reports: see `SECURITY.md`.

## Versioning

The public release starts at `0.x`. Breaking changes may occur in minor releases
until the content API stabilizes. Every public release must include a changelog
entry, package-content review, and `pnpm pack --dry-run` evidence.
