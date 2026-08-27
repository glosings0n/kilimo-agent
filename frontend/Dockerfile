# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy deps
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Set ENV for vite build
ENV VITE_BACKEND_URL=https://kilimo-backend-840262173056.us-central1.run.app

# Build the app
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config (Cloud Run expects listening on 8080)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
