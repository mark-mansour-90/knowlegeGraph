# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

# Install deps (cache-friendly)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build TS -> dist
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built output
COPY --from=build /app/dist ./dist

EXPOSE 4000

# IMPORTANT:
# If your compiled entry is not dist/index.js, change it here.
CMD ["node", "dist/index.js"]
