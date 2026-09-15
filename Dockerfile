# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY src ./src
COPY server ./server
COPY scripts ./scripts
RUN npm run build

FROM node:22-alpine AS server
WORKDIR /app
RUN npm install -g tsx@4.23.13
COPY server ./server
ENV SERVER_HOST=0.0.0.0
EXPOSE 3001
CMD ["tsx", "server/index.ts"]

FROM nginx:1.27-alpine AS client
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV NGINX_ENVSUBST_FILTER=SERVER_PORT
EXPOSE 80
