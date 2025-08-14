# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application's code
COPY . .

# Expose port 8000
EXPOSE 8000

# Command to run the application
# We are assuming your entry point is src/index.js.
# You may need to change this command based on your application's structure.
CMD [ "node", "src/index.js" ]
