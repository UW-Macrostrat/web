---
title: Website changelog
---

# Website changelog

Site-wide changes to the Macrostrat website, by release. Changes that belong to
a single interface are recorded in that interface's own changelog, such as the
[map interface changelog](map/changelog.md); the map's 4.x releases predate this
file and are recorded only there.

## Unreleased

- `/dashboard/admin/tasks` runs management tasks (topology updates first) on the
  worker, unattended, with their terminal output streamed live and a cancel that
  ends a run like Ctrl-C. Admin only; needs an api_v3 with `/tasks`.
- The admin page lists the build each service is running. The web server answers
  `/_version` and `/_health`.
- The map interface's usage guide and changelog moved out of the map's side
  panel and into this documentation section. Their old addresses, `/map/usage`
  and `/map/changelog`, redirect here.
