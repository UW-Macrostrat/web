FROM node:22

# Install rsync
RUN apt-get update && apt-get install -y rsync

ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY .yarn/releases .yarn/releases
COPY .yarnrc.yml yarn.lock package.json ./

# Copy only the elements needed for a Yarn install to take advantage of
# Docker's layer caching
# This is complex because we are working with multiple workspaces.

# Copy package JSON files with wildcards
# This scoops up all package.json files in the directory and subdirectories
# to deal with Yarn workspaces. However it requires BUILDKIT to be enabled,
# which is done by setting DOCKER_BUILDKIT=1 in the environment
RUN --mount=type=bind,target=/docker-context \
    cd /docker-context/; \
    find . -name "package.json" -mindepth 0 -maxdepth 5 -exec cp --parents "{}" /usr/src/app/ \;

RUN yarn install --immutable

# Load the cache from the previous build
RUN --mount=type=cache,target=/yarn-cache \
     rsync -a /yarn-cache/ .yarn/cache/ \
  && yarn install --immutable \
  && rsync -a .yarn/cache/ /yarn-cache

# # Remove rsync
RUN apt-get remove -y rsync

# Chromium's headless shell, for the cached map views the server draws of
# itself (src/map-snapshots). The shell only — not full Chromium, Firefox or
# WebKit — at the build playwright-core expects, with its system libraries.
# And tini, so Chromium's exited helper processes are reaped (see ENTRYPOINT).
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN yarn playwright-core install --with-deps chromium-headless-shell \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

# # Now we can run the full copy command

COPY . ./

RUN yarn run build

EXPOSE 3000

ENV NODE_NO_WARNINGS=1

# Build information, set by CI. Last, so a new commit leaves the layers above cached.
ARG MACROSTRAT_VERSION MACROSTRAT_RELEASE MACROSTRAT_COMMIT MACROSTRAT_BUILD_DATE MACROSTRAT_REPOSITORY
ENV MACROSTRAT_VERSION=$MACROSTRAT_VERSION \
    MACROSTRAT_RELEASE=$MACROSTRAT_RELEASE \
    MACROSTRAT_COMMIT=$MACROSTRAT_COMMIT \
    MACROSTRAT_BUILD_DATE=$MACROSTRAT_BUILD_DATE \
    MACROSTRAT_REPOSITORY=$MACROSTRAT_REPOSITORY

# A real init as PID 1. Chromium's helpers outlive the browser that started
# them and are re-parented to PID 1; yarn never reaps them, so without this each
# render batch would leave zombies behind.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["yarn", "node", "./dist/server/index.mjs"]
