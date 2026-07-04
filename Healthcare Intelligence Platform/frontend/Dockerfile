# Build Stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set build environment variables so it points to the containerized backend
ENV VITE_API_URL=http://localhost:5000/api/v1
RUN npm run build

# Production Stage - Nginx to serve static files
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy basic nginx config to handle SPA routing if needed
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
