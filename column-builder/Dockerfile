FROM node:14.19

WORKDIR /app/dacite

COPY package*.json ./

RUN npm install

EXPOSE 1234

CMD ["npm", "run", "dev"]