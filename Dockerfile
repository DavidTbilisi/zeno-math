FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787 DATA_DIR=/data STATIC_DIR=/app/dist
COPY --from=build /app/dist ./dist
COPY server ./server
# The server checks practice attempts against the app's list of skills and runs the learner model.
COPY src/math/practiceSkills.ts ./src/math/practiceSkills.ts
COPY src/model ./src/model
# The volume starts as a copy of this directory, so it has to belong to the user the server runs as.
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8787
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.ts"]
