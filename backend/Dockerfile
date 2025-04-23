FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the TypeScript code
RUN npm run build

# Create logs directory
RUN mkdir -p logs

EXPOSE 3001

# Start the server
CMD ["npm", "start"]