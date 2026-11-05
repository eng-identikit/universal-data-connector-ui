FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# The nginx image runs envsubst on /etc/nginx/templates/*.template at startup,
# replacing only defined variables (nginx's own $vars are left untouched).
ENV UI_API_BACKEND=ui-api:9000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
