FROM nginx:latest

# Copy the built files into the container at /usr/share/nginx/html
COPY ./dist/production/ /usr/share/nginx/html/map/

COPY ./deployment/index.html /usr/share/nginx/html/