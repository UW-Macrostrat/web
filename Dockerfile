FROM node:20 AS build

ENV NODE_ENV=production

WORKDIR /usr/src/app
COPY . ./

RUN yarn cache clean
RUN yarn add

CMD ["sh", "server/server.sh"]
