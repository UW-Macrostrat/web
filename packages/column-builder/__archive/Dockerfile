FROM node:14.19

WORKDIR /app/dacite

COPY package*.json ./
COPY deps/web-components/packages/ui-components/package.json ./deps/web-components/packages/ui-components/
COPY deps/web-components/packages/form-components/package.json ./deps/web-components/packages/form-components/
COPY deps/web-components/packages/data-components/package.json ./deps/web-components/packages/data-components/

RUN npm install

EXPOSE 1234

CMD ["npm", "run", "dev"]