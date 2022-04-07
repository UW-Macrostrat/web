# web-v3

Macrostrat's map interface is the intersection of stratigraphic, bedrock, paleoenvironment, and paleontology data in the modern world.

Currently the application is bundled using webpackv5; however, in the near future we will be transitioning to use [NextJs](https://nextjs.org/) to take advantage of server-side rendering, simplified page routing, and already managed bundling.

## Getting started

This package requires relatively new features of package managers for multi-package workspaces.
Make sure you have NPM version 7 or higher. This can be installed with `npm install -g npm@7`.
This package should work with Yarn, but we haven't yet tested it.

Install dependencies with `npm bootstrap` (which is simply an alias to `npm install --workspaces && npm install`).

To begin the development server run `npm run dev`. The server will be hosted to `localhost:3000` by defualt.
