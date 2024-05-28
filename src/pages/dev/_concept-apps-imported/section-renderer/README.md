# Macrostrat section renderer

This repository contains the codebase for
section-renderer applications using the Macrostrat API.

We anticipate developing a variety of applications over the same input modules
to showcase different overlays on the Macrostrat system. We are experimenting
with a "monorepo" organization for this codebase, in which related applications
can live in their own subdirectories and share common components. Right now, the
only app is in the `basic-renderer` directory.
A live version of this app
is available [here](https://davenquinn.com/viz/macrostrat-column-renderer/).

The `packages` subdirectory contains development
versions of several constituent modules, which are linked together at runtime
in a [npm workspace](https://docs.npmjs.com/cli/v7/using-npm/workspaces).
The `packages/common` module contains code that has not been formally split
into a standalone module, but is used by multiple apps. Important
functionality will eventually be standardized and independently versioned.

So far, the standalone packages included in this codebase are:

- [`@macrostrat/ui-components`](https://github.com/UW-Macrostrat/ui-components)
- [`@macrorstat/map-components`](https://github.com/UW-Macrostrat/map-components)
- [`@macrorstat/column-components`](https://github.com/UW-Macrostrat/column-components)

## Development

_In order to install the 'workspaced' NPM modules, you will need to be using
`npm` version 7 or newer, or a recent version of `yarn`._

Several of the dependencies in the `packages` directory are organized as
[git submodules](https://git-scm.com/docs/git-submodule). To get the code for
these, run `git submodule update --init`.

Then install packages using `npm install` and run the development server using
`npm run dev`. Internally, this kicks off bundling watchers for module dependencies
and the core application. The application is bundled using [Parcel](https://parceljs.org)
and can be found on https://localhost:1234 by default.

## Related demos

Several demo applications in development at Macrostrat are based on the same modules
used here, but organized in their own codebases. Here are a few:

- [Stratigraphic column editor](https://davenquinn.com/viz/stratigraphic-column-editor/)
- [Corelle PBDB demo](https://davenquinn.com/viz/corelle-demo-pbdb/)

## Changelog

### December 2020

Initial shifts towards a monorepo organizational pattern

### June 2020

- Shift to external `@macrostrat/map-components` module
- Create a new animated map

### January 2020

Initial version
