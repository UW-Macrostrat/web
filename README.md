# Macrostrat's map interface

Macrostrat's map interface is web portal to a geologic model of the Earth's crust.

Version 5 of the application transitions to using [Vite](https://vitejs.dev/) for bundling and [Vike](https://vike.dev/)
for server-side rendering. We are working on updating this version for performance and stability.

## Installation for local development

1. Clone the repository
2. Pull down submodules (`git submodule update --init --recursive`)
3. Create and populate a `.env` file with the appropriate environment variables (See [
   `.env.example`](https://github.com/UW-Macrostrat/web/blob/main/.env.example) for more information.)
4. Verify that you have access to recent versions of Node.js and the Yarn package manager ( `node >= 16.0.0` and
   `yarn >= 4.0.0`; run `node -v` and `yarn -v` to check)
5. Run `yarn install` to update packages
6. Start the live-reloading development server with `yarn run dev`. The server will be available at
   `http://localhost:3000` by default.

## Contributing

Please see the [Contributing guide](./CONTRIBUTING.md) for information on how to contribute to this codebase.

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

   You do this by updating the image tag here to whatever you tagged
   above: https://github.com/UW-Macrostrat/tiger-macrostrat-config/blob/main/manifests/development/web/deployment-patch.yaml

## Testing authentication on localhost

If you are developing locally and need to test authentication, you can
use a browser extension like **CookieSync** to automatically pull cookies from the production or development
site into your local environment. This will allow you to use the same session
information locally. The cookie that must be copied is called `access_token`.

We will eventually build an enhanced authentication service to allow for easier
local development.

```sh
MACROSTRAT_API_PROXY_DOMAIN="https://dev2.macrostrat.org"
VITE_MACROSTRAT_API_DOMAIN="http://localhost:3000"
```

