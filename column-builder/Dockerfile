FROM node:14.19

WORKDIR /app/dacite

COPY package*.json ./
COPY deps/ui-components/packages/ui-components/package.json ./deps/ui-components/packages/ui-components/
COPY deps/ui-components/packages/form-components/package.json ./deps/ui-components/packages/form-components/
COPY deps/ui-components/packages/data-components/package.json ./deps/ui-components/packages/data-components/

RUN npm install

EXPOSE 1234

CMD ["npm", "run", "dev"]