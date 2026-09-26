FROM node:22-slim AS web
WORKDIR /build/apps/web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
RUN npm run build
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app/apps/api
COPY apps/api/package*.json ./
RUN npm ci --omit=dev
COPY apps/api/ ./
COPY database /app/database
COPY --from=web /build/apps/web/dist /app/apps/web/dist
USER node
EXPOSE 5000
CMD ["node","src/server.js"]
