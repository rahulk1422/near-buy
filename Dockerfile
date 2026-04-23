FROM node:20-alpine AS frontend-builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY Backend/package*.json ./Backend/
RUN npm ci --omit=dev --prefix Backend

COPY Backend ./Backend
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "Backend/server.js"]
