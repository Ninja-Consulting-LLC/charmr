FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Build the TypeScript code
RUN npm run build

# Verify the build was successful
RUN ls -la dist/

EXPOSE 3001

# Use a shell script to ensure the server starts properly
CMD ["sh", "-c", "npm run build && npm start"]