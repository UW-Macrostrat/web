FROM nginx:latest

# Copy the built files into the container at /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html/map
COPY ./dist/ /usr/share/nginx/html/map/

COPY ./deployment/index.html /usr/share/nginx/html/