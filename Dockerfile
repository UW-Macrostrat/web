FROM node:20 AS build

ARG MAPBOX_API_TOKEN
ENV MAPBOX_API_TOKEN=$MAPBOX_API_TOKEN

ARG PUBLIC_URL
ENV PUBLIC_URL=$PUBLIC_URL

ARG MACROSTRAT_API_DOMAIN
ENV MACROSTRAT_API_DOMAIN=$MACROSTRAT_API_DOMAIN

WORKDIR /usr/src/app
COPY . ./

RUN yarn cache clean
RUN yarn add
RUN yarn run bundle

FROM nginx:stable
COPY --from=build /usr/src/app/dist /usr/share/nginx/html
