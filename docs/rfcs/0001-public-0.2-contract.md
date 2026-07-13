# RFC 0001: Public 0.2 contract

- Status: Proposed
- Target: `0.2.0-beta.8`
- Last updated: 2026-07-13

## External problem

Static-content hosts need immutable, framework-independent records, paths, indexes, sorting, filtering, and image-srcset construction without inheriting product URL or image policy.

## Public surface

The supported imports are `.`, `./allData`, `./image-srcset`, `./pageData`, `./pages`, `./url`, and `./types`. Exports are ESM-only ES2022 with
declarations and Node.js 22 or newer. Undeclared deep imports are private.

## Non-goals

VitePress integration, transliteration defaults, product frontmatter, filer URLs, UI, routes, and environment policy remain outside this package.

## Compatibility and release evidence

Two maintained site consumers, the shared UI consumer, and Advayta must consume
the exact candidate bytes; URL, canonical, sitemap, and wikilink manifests must
show no unapproved changes.

The candidate is built and packed once from a clean protected source commit.
The npm-format tarball, SHA-512 digest, per-file manifest, source commit, and
GitHub attestation remain immutable. A failed candidate receives a new beta
version; no tag or asset is replaced.

## Decision

Accept this contract only after the source pull request, API report, package
tests, clean rooms, and named-consumer evidence have no unresolved actionable
findings.
