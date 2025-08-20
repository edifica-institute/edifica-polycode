
# server/Dockerfile
FROM node:20-bookworm

# Install compilers/interpreters you plan to support
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    build-essential \
    python3 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server deps
COPY package*.json ./
RUN npm ci || npm i

# Copy source
COPY . .

# Render expects the app to listen on $PORT
ENV PORT=8080
ENV SANDBOX=local
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "index.js"]









FROM node:18-bullseye

# Install Python 3 for the Python runner
RUN apt-get update && apt-get install -y --no-install-recommends python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
# If your entry file is index.js, keep as-is; otherwise change the path
CMD ["node", "index.js"]
