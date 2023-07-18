FROM node:20 AS build

WORKDIR /usr/src/app
COPY . ./

RUN yarn cache clean
RUN yarn add
RUN yarn run bundle

FROM nginx:stable
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
