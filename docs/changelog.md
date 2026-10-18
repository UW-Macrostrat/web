---
title: Website changelog
---

# Website changelog

Site-wide changes to the Macrostrat website, by release. Changes that belong to
a single interface are recorded in that interface's own changelog, such as the
[map interface changelog](map/changelog.md); the map's 4.x releases predate this
file and are recorded only there.

## 5.4.1

_October 2026_

### Site

- The homepage's map-polygon count no longer multiplies the total by the number
  of projects.
- Client-side navigation to the homepage no longer loads megabytes of unused
  column data.

## 5.4.0

_October 2026_

### Site

- Community pages at `/community/apps`, `/community/integrations` and
  `/community/providers`, and a contact page at `/contact`.
- Apps, people and supporters each appear in one list, ordered by tier; grants
  show as cards with title, program and PI, newest first.
- Site pages use the collapsing page header.
- Layouts for small screens on the map, column and map pages.
- Reworked homepage hero.

### Lexicon

- Sift is retired: its links (`/sift/#/strat_name/1`, `/sift/unit/1`, …)
  redirect to the matching lexicon, column or project page.
- The lexicon index links the legacy Sift app at `v1.macrostrat.org/sift/` and
  no longer shows an Updates dialog.

### Access

- Creating a column (`/columns/new`) requires an authorized account.
- Integration pages and the globe preview appear only outside production, as
  set by `MACROSTRAT_ENV`.

### Operations

- Built on Vite 8, with the server defined in Vike's `+server.ts`; vike-photon
  is removed.
- Redirects behind the HTTPS proxy point at `https://` addresses instead of
  `http://`.

## 5.3.0

_October 2026_

### Site

- New homepage: a live map and column, entry points to the map, columns, lexicon
  and projects, and recent news.
- Site search (⌘K) on the homepage, the lexicon and the About pages.
- One page header across the site, with breadcrumbs, sticky on scroll.
- About, Community and Publications pages, written in the documentation vault;
  Publications lists Macrostrat's Zotero library.
- `/about/people`, `/about/apps`, `/about/support` and `/about/version-2`.
- Documentation at `/docs`, built from the Macrostrat documentation vault.
- The map's usage guide and changelog are documentation pages.
- Old addresses redirect: `/people`, `/support`, `/map/usage`, `/map/changelog`,
  the v1 homepage anchors (`/#people`, `/#api`, …) and Sift's `/sift/#/…` links.

### Accounts

- Sign in with ORCID; the dashboard shows your profile, role and session.
- Expired sessions refresh without signing in again.
- Admin tools at `/dashboard/admin`: users and roles, API tokens, the build each
  service runs, and tile-cache management.

### Map

- Reworked info drawer: geologic map and stratigraphy sections, links to the
  map's own page and the tile inspector.
- Map pages (`/maps/<id>`) with a legend table; `/maps/diff` compares two map
  tilesets side by side.
- Compilation selector (beta) for maps other than the default compilation.
- Fewer queries while panning; the info panel no longer reloads on zoom.
- Map search environment filters fixed.
- Map ingestion rebuilt as a table at `/maps/ingestion`; the old interface is
  gone.

### Columns

- Column pages draw the column beside its map, in a layout shared with the
  lexicon.
- A time filter on column and correlation pages.
- Column editor at `/columns/<id>/edit` and `/columns/new`: metadata, location,
  units, facies and grain size.
- Upload a column file from `/columns/new`, with a dry-run preview in the editor.

### Lexicon

- Reworked lexicon pages with hierarchy navigation and a map that persists
  between pages.
- Lithology and stratigraphic-name matching at `/lex/match`.

### Knowledge graph

- Knowledge-graph pages moved to `/ext/kg`, with paper summaries; feedback can
  be edited and deleted.

### Operations

- The web server answers `/_version` and `/_health`.
