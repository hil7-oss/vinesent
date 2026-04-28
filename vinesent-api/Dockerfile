FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS migrate
WORKDIR /app
COPY prisma ./prisma
CMD ["npx","prisma","migrate","deploy"]

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG FASTAPI_URL
ARG NEXT_PUBLIC_FASTAPI_URL
ENV NODE_ENV=production
ENV FASTAPI_URL=${FASTAPI_URL}
ENV NEXT_PUBLIC_FASTAPI_URL=${NEXT_PUBLIC_FASTAPI_URL}
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node","server.js"]
