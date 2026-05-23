# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies and generate Prisma client
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: Production Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev

# Briefly install Prisma CLI to generate the production client
RUN npm install prisma --no-save
RUN npx prisma generate

# Remove the CLI to keep the image minimal
RUN npm uninstall prisma

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Don't run production as root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S expressjs -u 1001

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Change ownership
RUN chown -R expressjs:nodejs /app

USER expressjs

EXPOSE 3000

CMD ["npm", "start"]
