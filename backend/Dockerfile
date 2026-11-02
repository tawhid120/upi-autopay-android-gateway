FROM node:24-alpine

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Expose backend port
EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
