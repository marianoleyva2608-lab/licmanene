FROM nginx:alpine

# Copy static assets to Nginx html folder
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Nginx starts automatically
