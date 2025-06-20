# ------------ Build Stage ------------
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy all source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS app
RUN npm run build


# ------------ Production Stage ------------
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy only needed files from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Expose backend port
EXPOSE 3001

# Run the app
CMD ["node", "dist/main"]
