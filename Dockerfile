FROM node:22-slim
LABEL authors="jaxkdev"

# Create app directory and set permissions
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

# Set the working directory
WORKDIR /home/node/app

# Copy package.json and package-lock.json (if present)
COPY --chown=node:node package*.json ./

# Use a non-root user
USER node

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY --chown=node:node . .

# Expose port
# EXPOSE 80

# Start the application
CMD ["npm", "start"]