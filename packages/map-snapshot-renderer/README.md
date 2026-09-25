# Map snapshot renderer

Renders the site's **cached map views** — stills of maps such as the homepage
hero, served as images until a reader asks for the live map — in headless
Chromium, and publishes them where the site reads them.

It drives the site itself: `/dev/map-snapshot` lists every view and the key it
is filed under, and `/dev/map-snapshot/<kind>/<id>` draws one with the live
component. So the renderer holds no knowledge of the views, and always renders
what the target deployment describes. Design notes: the workbench feature area
"Cached map views".

## Locally

With the dev server running (`yarn dev`), from the web repository's root:

```sh
yarn snapshots:local
```

This renders into `public/map-snapshots/`, which Vite serves. For the site to use
them, web's `.env` needs

```sh
VITE_MACROSTRAT_MAP_SNAPSHOTS_URL=/map-snapshots
```

and the command says so if the running server doesn't have it (restart the dev
server after adding it). A relative URL means "files under `public/`": the images
load from whatever origin served the page, and the manifest is read from disk
on every request, so a fresh render shows on reload.

It needs a browser. Either `yarn snapshots:install-browser` (Playwright's headless
Chromium, ~320 MB, into Playwright's cache) or an installed Google Chrome, which
it finds on its own; `CHROMIUM_PATH` points at anything else.

`yarn snapshots:render` is the general form, writing to `dist/map-snapshots` by
default. Both take:

| Flag         | Variable                   | Default                   |
| ------------ | -------------------------- | ------------------------- |
| `--site-url` | `MAP_SNAPSHOTS_SITE_URL`   | `http://localhost:3000`   |
| `--out`      | `MAP_SNAPSHOTS_OUT`        | `dist/map-snapshots`      |
| `--only`     | `MAP_SNAPSHOTS_ONLY`       | every view; `kind/id`, comma-separated |
| `--timeout`  | `MAP_SNAPSHOTS_TIMEOUT_MS` | `120000` per view         |
| `--chromium` | `CHROMIUM_PATH`            | Playwright's, then Chrome |

(`snapshots:local` fixes `--out`.)

## The container

`Dockerfile` builds an image with Node, Chromium's headless shell and rclone, and
none of the site — build it from the repository root:

```sh
docker build -f packages/map-snapshot-renderer/Dockerfile -t map-snapshot-renderer .
```

CI publishes it as `hub.opensciencegrid.org/macrostrat/map-snapshot-renderer`.
It is a run-to-completion job: render every view, upload, exit. Configured by
environment alone:

| Variable                      | Meaning                                                |
| ----------------------------- | ------------------------------------------------------ |
| `MAP_SNAPSHOTS_SITE_URL`      | the site to render (required)                          |
| `MAP_SNAPSHOTS_ONLY`          | limit to some views; the rest of the manifest is kept  |
| `MAP_SNAPSHOTS_TIMEOUT_MS`    | per-view settle timeout                                |
| `MAP_SNAPSHOTS_S3_BUCKET`     | unset: render only, into `/snapshots`                  |
| `MAP_SNAPSHOTS_S3_PREFIX`     | default `web/map-snapshots`                            |
| `MAP_SNAPSHOTS_S3_ENDPOINT`   | e.g. `https://storage.macrostrat.org`                  |
| `MAP_SNAPSHOTS_S3_ACCESS_KEY` | from a secret                                          |
| `MAP_SNAPSHOTS_S3_SECRET_KEY` | from a secret                                          |
| `MAP_SNAPSHOTS_S3_ACL`        | default `public-read`; empty to send no ACL            |

With a bucket, it starts from the published `manifest.json`, uploads the images
(`Cache-Control: max-age=31536000` — their URLs carry `?v=<renderedAt>`) and then
the manifest (`max-age=60`), so the published manifest never names a file that
isn't there yet. It exits non-zero if any view failed, after publishing the ones
that rendered.

The site reads the result with
`VITE_MACROSTRAT_MAP_SNAPSHOTS_URL=https://storage.macrostrat.org/assets/web/map-snapshots`.

Render-only, against a site on the host:

```sh
docker run --rm --network host -e MAP_SNAPSHOTS_SITE_URL=http://localhost:3000 \
  -v "$PWD/dist/map-snapshots:/snapshots" map-snapshot-renderer
```

(`--network host` is Linux-only. From Docker Desktop the host is
`host.docker.internal`, which Vite's `server.allowedHosts` rejects — run
`yarn snapshots:local` on the host instead.)
