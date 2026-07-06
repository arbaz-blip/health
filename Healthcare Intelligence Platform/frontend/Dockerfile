# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Accept VITE_API_URL from Railway's build-time variables (set this in the service's Variables tab)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production Stage - Nginx to serve static files
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN rm -f /etc/nginx/conf.d/default.conf
RUN mkdir -p /etc/nginx/templates
RUN printf 'server {\n    listen %s;\n    location / {\n        root /usr/share/nginx/html;\n        index index.html index.htm;\n        try_files $uri $uri/ /index.html;\n    }\n}\n' '${PORT}' > /etc/nginx/templates/default.conf.template
ENV PORT=80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]