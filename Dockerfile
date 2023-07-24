FROM node:20 AS build

ARG MAPBOX_API_TOKEN
ENV MAPBOX_API_TOKEN=$MAPBOX_API_TOKEN

WORKDIR /usr/src/app
COPY . ./

RUN yarn cache clean
RUN yarn add
RUN yarn run bundle

FROM nginx:stable
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
