# Build stage
FROM node:18-alpine as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code (node_modules is excluded via .dockerignore)
COPY . .

# Remove any accidentally copied node_modules (e.g. from Windows host)
# and reinstall cleanly inside the Linux container
RUN rm -rf node_modules && npm install --legacy-peer-deps

# Ensure vite binary is executable
RUN chmod -R +x node_modules/.bin

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
