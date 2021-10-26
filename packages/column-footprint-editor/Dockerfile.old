FROM node:12

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH


COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 1234
CMD ["npm", "start"]