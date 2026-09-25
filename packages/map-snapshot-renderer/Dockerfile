# The map snapshot renderer: Node, Chromium's headless shell and rclone — and
# none of the site. Build from the repository root:
#
#   docker build -f packages/map-snapshot-renderer/Dockerfile -t map-snapshot-renderer .
#
# Configured entirely by environment; see entrypoint.sh.
FROM node:22-bookworm-slim

WORKDIR /app

# The workspace manifests, so Yarn can resolve the lockfile — then an install
# of only this package and what it depends on.
COPY .yarn/releases .yarn/releases
COPY .yarnrc.yml yarn.lock package.json ./
RUN --mount=type=bind,target=/docker-context \
    cd /docker-context/; \
    find . -name "package.json" -mindepth 0 -maxdepth 5 -not -path "./.yarn/*" \
      -exec cp --parents "{}" /app/ \;
RUN yarn workspaces focus @macrostrat-web/map-snapshot-renderer --production

# The headless shell only (not full Chromium, Firefox or WebKit), at the
# version this playwright-core expects, with the system libraries it needs.
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN yarn workspace @macrostrat-web/map-snapshot-renderer exec \
      playwright-core install --with-deps chromium-headless-shell \
  && apt-get install -y --no-install-recommends rclone ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY packages/map-snapshots packages/map-snapshots
COPY packages/map-snapshot-renderer packages/map-snapshot-renderer

RUN mkdir /snapshots && chown node:node /snapshots
USER node
ENV MAP_SNAPSHOTS_OUT=/snapshots

ENTRYPOINT ["/app/packages/map-snapshot-renderer/entrypoint.sh"]
