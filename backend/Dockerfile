FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and other necessary files
COPY src/ ./src/
COPY tsconfig.json ./
COPY .env* ./
COPY service-account.json ./

# Build the TypeScript code
RUN npm run build

# Create required directories
RUN mkdir -p logs data

EXPOSE 3001

# Start the server
CMD ["npm", "start"]