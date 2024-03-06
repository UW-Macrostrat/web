# Macrostrat's map interface

Macrostrat's map interface is the intersection of stratigraphic, bedrock, paleoenvironment, and paleontology data in the modern world.

Currently the application is bundled using webpackv5; however, in the near future we will be transitioning to use [NextJs](https://nextjs.org/) to take advantage of server-side rendering, simplified page routing, and already managed bundling.

## Installation for local development

1. Clone the repository
2. Pull down submodules (`git submodule update --init --recursive`)
3. Run `yarn install` to update packages
4. `yarn run dev` starts the development server

## Packaging

### Running locally with Docker

Spins up a instance of the website for development on the same node image used for prod. 

```bash
docker run -it -p 3010:3000 -v $(pwd):/app -w /app node:20 git config --global --add safe.directory /app && yarn run dev
```

### Building for production

This is mainly here for reference, the actual prod image is built via Github CI.

```bash
docker build -t macrostrat:latest --build-arg PUBLIC_URL=/map/ --build-arg MAPBOX_API_TOKEN=<> .
```

### Running built image

If for some reason you want to run the prod image locally you can do it like so.

```bash
docker run -d -p 8089:80 macrostrat:latest
```

## Deploying on Kubernetes

To deploy to kubernetes there is two steps.

1. Tag the image

   You do this by `git tag <semver-tag>` and `git push --tag origin`

2. Update the deployment in Kubernetes

   You do this by updating the image tag here to whatever you tagged above: https://github.com/UW-Macrostrat/tiger-macrostrat-config/blob/main/manifests/development/web/deployment-patch.yaml
