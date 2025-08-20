FROM node:20-bookworm

# Install Java & Python for the runners
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    python3 \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install server deps
COPY package*.json ./
RUN npm ci --omit=dev || npm i --omit=dev

# Copy source
COPY . .

# Render expects the app to listen on $PORT
ENV PORT=8080
ENV SANDBOX=local
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "index.js"]
