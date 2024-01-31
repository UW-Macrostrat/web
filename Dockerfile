FROM node:20

# Install rsync
RUN apt-get update && apt-get install -y rsync

ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY . ./

# Load the cache from the previous build
RUN --mount=type=cache,target=/yarn-cache \
     rsync -a /yarn-cache/ .yarn/cache \
  && yarn install --immutable \
  && yarn run bundle \
  && rsync -a .yarn/cache/ /yarn-cache


EXPOSE 3000

CMD ["yarn", "run", "server"]
