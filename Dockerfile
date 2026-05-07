# Use lightweight Node image
FROM node:20

# Create app directory
WORKDIR /app

# Copy dependency files first (better caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install 

# Copy application source
COPY . .

# App runs on this port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]