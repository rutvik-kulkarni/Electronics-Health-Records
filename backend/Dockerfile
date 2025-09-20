FROM node:18-alpine

WORKDIR /app

# Install curl and netcat
RUN apk add --no-cache curl netcat-openbsd

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
