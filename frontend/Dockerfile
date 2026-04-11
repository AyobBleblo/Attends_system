# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Clean reinstall inside the Linux container (avoids Windows symlink issues)
RUN rm -rf node_modules && npm install --legacy-peer-deps

RUN chmod -R +x node_modules/.bin
RUN npm run build

# ── Stage 2: Nginx with self-signed TLS cert ──────────────────────────────────
FROM nginx:alpine

# Install OpenSSL (already present in nginx:alpine, but be explicit)
RUN apk add --no-cache openssl

# Generate a self-signed certificate valid for 10 years.
# Students will see a browser warning the very first time → click "Advanced →
# Proceed" once. After that, the browser remembers.
# Replace with a real cert (e.g. Let's Encrypt) for a public domain.
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/selfsigned.key \
      -out    /etc/nginx/ssl/selfsigned.crt \
      -subj   "/C=DZ/ST=Algiers/L=Algiers/O=UniAttend/OU=IT/CN=uniattend.local"

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose both HTTP (redirect) and HTTPS (app)
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
