FROM node:16-alpine AS deps

WORKDIR /app/
COPY package.json ./
COPY deps/ui-components/packages/ui-components/package.json ./deps/ui-components/packages/ui-components/
COPY deps/ui-components/packages/form-components/package.json ./deps/ui-components/packages/form-components/
COPY deps/ui-components/packages/data-components/package.json ./deps/ui-components/packages/data-components/

RUN npm install


# 2. Rebuild the source code only when needed
FROM node:16-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# This will do the trick, use the corresponding env file for each environment.
COPY ./.env.production .

RUN npm run build

# 3. Production image, copy all the files and run next
FROM node:16-alpine AS runner
WORKDIR /app/

ENV NODE_ENV=production

# You only need to copy next.config.js if you are NOT using the default configuration
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/.env.production ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 1234

ENV PORT 1234

CMD ["npm", "run", "start"]