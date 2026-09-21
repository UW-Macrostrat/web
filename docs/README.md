---
title: Macrostrat website
---

# Macrostrat website

User-facing documentation for the Macrostrat website: how to use its interfaces,
and what has changed in them. These pages are written in this repository, next
to the code they describe, and published as the _Website_ section of
Macrostrat's [platform documentation](https://github.com/Macrostrat/docs) at
`/docs/website`.

## Contents

- [Changelog](changelog.md) — site-wide changes, by release.
- [Map interface](map/README.md) — the geologic map at `/map`:
  [usage guide](map/usage.md) and [changelog](map/changelog.md).

## How this directory is organized

Documentation here is **code-coupled**: it describes this codebase, so it is
written and reviewed in the pull request that ships the change it describes. The
layout has one level for the whole site and one level per interface, so both
site-wide and per-page material have a place:

| Path                       | Holds                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `README.md`                | This page: the section landing.                                                             |
| `changelog.md`             | Changes that affect the whole site, by release.                                             |
| `<interface>/README.md`    | What an interface is and where to find it. Names the route it lives at (`map/` for `/map`). |
| `<interface>/usage.md`     | Feature guidance for that interface.                                                        |
| `<interface>/changelog.md` | Changes specific to that interface, by release.                                             |

Conventions, shared with every other federated documentation source:

- **Plain markdown** (`.md`): GitHub-flavored markdown, `[[wikilinks]]`, and
  Obsidian callouts. Raw HTML is rendered, which is how videos are embedded
  (`<video>` with a link inside as a fallback).
- **Link between pages relatively**, as on GitHub (`[Changelog](changelog.md)`,
  `[site changelog](../changelog.md#unreleased)`). The publisher rewrites them
  to the published addresses. Link to site pages by root-relative path (`/map`).
  Do not link up into the vault's own pages, so these files stay valid on their
  own.
- **Headings get GitHub-style ids** (`## Version 4.1.0` → `#version-410`), so a
  changelog entry can be linked from a usage page in either place.
- **Media is not committed.** Screenshots and videos live in the object store
  and are referenced by URL; the vault's reference check verifies that every
  referenced file resolves. Existing map-interface media is on the legacy
  `macrostrat-media` bucket.
- The page title comes from `title` in the frontmatter (else the first `#`
  heading); `README.md` stands for its directory.
