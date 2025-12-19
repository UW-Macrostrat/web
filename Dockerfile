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

# # Now we can run the full copy command

COPY . ./

RUN yarn run build

EXPOSE 3000

ENV NODE_NO_WARNINGS=1

CMD ["yarn", "run", "server"]
