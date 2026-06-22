# syntax=docker/dockerfile:1

FROM node:22-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies

ENV NODE_ENV=development

COPY package.json package-lock.json ./

RUN npm ci

FROM dependencies AS build

COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY prisma ./prisma
COPY apps ./apps

RUN npm run prisma:generate
RUN npm run build

FROM base AS production-dependencies

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

FROM base AS runtime

ENV NODE_ENV=production

LABEL org.opencontainers.image.title="EduFlow Marketing Automation" \
  org.opencontainers.image.description="Event-driven marketing automation platform for academic campaigns." \
  org.opencontainers.image.source="https://github.com/fbmsoltech/eduflow-marketing-automation" \
  org.opencontainers.image.licenses="MIT"

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

USER node

EXPOSE 3000

FROM build AS migrations

ENV NODE_ENV=production

CMD ["npm", "run", "prisma:migrate:deploy"]

FROM runtime AS application

CMD ["npm", "run", "start"]
