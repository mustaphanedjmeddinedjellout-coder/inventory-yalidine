FROM node:18-alpine

WORKDIR /app

# Build frontend
COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

# Install backend dependencies
COPY server/package*.json ./server/
RUN cd server && npm install

COPY server/ ./server/

# Create data and uploads directories
RUN mkdir -p /data /app/server/uploads

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/inventory.db
ENV UPLOAD_DIR=/app/server/uploads

WORKDIR /app/server
CMD ["node", "src/index.js"]
