FROM node:24.15.0-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --ignore-scripts
COPY apps/api apps/api
COPY packages/contracts packages/contracts
RUN npm run build --workspace @smart-rounding/contracts && npm run build --workspace @smart-rounding/api

FROM node:24.15.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace @smart-rounding/api --workspace @smart-rounding/contracts && npm cache clean --force
COPY --from=build /workspace/apps/api/dist apps/api/dist
COPY --from=build /workspace/packages/contracts/dist packages/contracts/dist
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
