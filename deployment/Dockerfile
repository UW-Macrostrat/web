FROM nginx:latest

# Copy the configuration file into the container at
COPY ./deployment/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files into the container at /usr/share/nginx/html

RUN mkdir -p /usr/share/nginx/html/map
COPY ./dist/ /usr/share/nginx/html/map/

COPY ./deployment/index.html /usr/share/nginx/html/