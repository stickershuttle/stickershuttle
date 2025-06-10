# frontend/Dockerfile

# 1) Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install deps and build
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2) Runtime stage
FROM node:18-alpine
WORKDIR /app

# Copy package files so npm start can run
COPY --from=builder /app/package*.json ./

# Copy build output and assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
