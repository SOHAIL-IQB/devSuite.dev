# Stage 1: Build React/Vite App
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# We use Vite's standard build script
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:alpine AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled frontend from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom secure Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Do not run as root
# Nginx alpine image has 'nginx' user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
