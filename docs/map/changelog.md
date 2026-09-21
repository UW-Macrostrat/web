---
title: Map interface changelog
---

# Map interface changelog

Releases of the map interface, newest first. Since version 5.0 the map is one
page of the unified Macrostrat website, and changes that affect the whole site
are recorded in the [website changelog](../changelog.md); the entries below
cover the map interface itself. The [usage guide](usage.md) describes the
features these releases introduced.

## Version 4.2.0

_August 25, 2023 · development release_

- Switched Webpack compilation to Vite
- Experimental paleogeographic map interface
- Experimental ability to focus on a map source
- Info panel fixes
- Shift+Click to construct cross sections
- Allow cross-sections to be linked to externally (example:
  [Kaibab Arch](/map/cross-section/-112.3775,36.6438/-111.6447,35.8481#x=-112.3983&y=36.6538&z=7.4))

### Version 4.1.3

_February 4, 2023_

Fix poor sequencing of API calls to improve info panel loading times.

### Version 4.1.2

_February 3, 2023_

- Address bug where the wrong map information was shown
  ([#75](https://github.com/UW-Macrostrat/web/issues/75))
- Address bug that caused regional stratigraphy and fossil data to not appear in
  the info panel ([#76](https://github.com/UW-Macrostrat/web/issues/76))
- Refactored PBDB layer to work with new filter system
- Refactored column info loading to simplify logic
- Small improvements to performance

### Version 4.1.1

_February 2, 2023_

- Fix navigation to some menu panels
- Allow linking to experimental line symbols as a normal map layer
- Include a notice that line symbols are enabled to the filter panel

## Version 4.1.0

_February 1, 2023_

### User interface improvements

![The new Settings panel](https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/settings-panel.png)

- Added a new _Settings_ panel to control map display options. The _Experiments_
  sub-panel allows previews of new features that are still in development.
- Added a **Dark mode** for the entire user interface, including a new map
  style. This follows the browser-level preference by default, but it can be
  overridden from the _Settings_ panel.

<video src="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/dark-mode.mp4" controls loop muted playsinline preload="metadata">
  <a href="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/dark-mode.mp4">Video: toggling dark mode</a>
</video>

#### Map features and bug fixes

<video src="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/basemap-labels.mp4" controls loop muted playsinline preload="metadata">
  <a href="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/basemap-labels.mp4">Video: toggling basemap labels</a>
</video>

- Added an option to show and hide text labels on the map (in the _Settings_
  panel)
- Added a scale bar
- Moved the _User location_ control to the bottom right corner of the map panel
- Improved the visual quality of hillshades when 3D terrain is enabled
- Decoupled location marker sizing and visual design from map style
- Added an experimental _Map sources_ layer (_not yet fully integrated into the
  user interface_)

![The Rocky Mountains without map labels](https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/cordillera-without-labels.png)

#### Info panel

![The info panel header](https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/infobox-header.png)

![The age refinement panel](https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/age-refinement-panel.png)

- Update [xDD](https://xdd.wisc.edu) publications list to use the newer snippets
  API.
- Added an _Age refinement_ panel to show relative age precision improvement
  using the Macrostrat age model.
- Add buttons in the header to recenter the currently selected map location and
  to copy the location permalink to the clipboard.

#### Line symbols (experimental)

<video src="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/experimental-line-symbols.mp4" controls loop muted playsinline preload="metadata">
  <a href="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/experimental-line-symbols.mp4">Video: experimental line symbols</a>
</video>

_Line symbols are critical to the representation of crustal processes on
geologic maps._

In the _Experiments_ panel, we have added a toggle for _Line symbols_, which
enables a new rendering system for fault ticks and fold axes. This is an
exciting advance that greatly increases the legibility and information density
of the geologic map to align with printed products. Although the graphical style
is nearly complete, data inconsistencies block us from enabling this feature
broadly at the moment. Many source GIS datasets (especially older ones) do not
record consistent orientation of faults and folds that allow symbology to be
reconstructed. We must develop a strategy for correcting these data. As we
embark on this process, we will begin making this system "live" on a map-by-map
basis.

### Location and filter state saving

- The focused location and info box can be loaded from URL parameters, allowing
  map locations to be easily shared. Optional hash parameters set view
  orientation, layer, and map filter state. The URL signature is
  `https://macrostrat.org/map/loc/<lon>/<lat>#<hash>`.
- Correctly save filter states from URL parameters.
- Major simplification of the internal design of the map filter system.

<video src="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/save-location.mp4" controls loop muted playsinline preload="metadata">
  <a href="https://macrostrat-media.s3.amazonaws.com/maps/docs/version-4.1.0/save-location.mp4">Video: saving location state</a>
</video>

#### Examples of saved state

- [_Black Canyon of the Gunnison_, oblique satellite view](/map/loc/-107.7083/38.5802#x=-107.8909&y=38.7058&z=8.73km&a=132&e=76&show=satellite,geology)
- [_Vishnu Schist in the Grand Canyon_, oblique view](/map/loc/-112.1976/36.0962#strat_name_concepts=11016&x=-112.236&y=36.2119&z=15.61km&a=165&e=42)
- [_Mesozoic igneous rocks of California_, overhead view with labels hidden](/map#intervals=32&lithology_classes=igneous&x=-116.7569&y=34.7144&z=7.6&hide=labels)

### Internal improvements

- Yarn "Plug-n-Play" for quicker and more repeatable compilation
- Updated key dependencies, including Webpack, Mapbox GL JS, React, and
  BlueprintJS.
- Numerous updates to
  [Macrostrat shared web components](https://github.com/UW-Macrostrat/web-components).
- Decoupled interactions in the map view, and moved more components to the
  [`@macrostrat/mapbox-react`](https://npmjs.org/package/@macrostrat/mapbox-react)
  and
  [`@macrostrat/mapbox-utils`](https://npmjs.org/package/@macrostrat/mapbox-utils)
  shared libraries.
- Routing improvements in anticipation of adding non-map pages to the
  application.

## Version 4.0.0

_July 6, 2022_

The 4.0 series represents the first major update to the Macrostrat web interface
since 2018. It is the first major version of Macrostrat's web visualization
components that is an evolution of the codebase rather than a complete rewrite.
The 4.0 milestone simplifies, modernizes, and modularizes this application to
allow a more collaborative development process.

Future iterations in the 4.0 series will add functionality such as stratigraphic
columns, paleogeography, geochemical data holdings, and more.

This update was produced by Macrostrat technical lead
[Daven Quinn](https://davenquinn.com) and research software engineer
[Casey Idzikowski](https://caseyidzikowski.com).

### User-facing changes

- Add a globe-based map projection and an oblique map view with 3D terrain
  (thanks [Mapbox](https://www.mapbox.com/)!)
- Removed [Material UI](https://material-ui.com/) in favor of
  [Blueprint](https://blueprintjs.com/)
- Make panels simpler and more information-dense
- Store oblique camera positions in hash string
- Numerous bug fixes for filtering map data
- In the info panel, expand all sections by default, and improve scrolling
  through them

### Internal changes

- Convert codebase to TypeScript from JavaScript
- Start converting JSX to hyperscript
- Update React code to use functional components and hooks
- Improve handling of query strings
- Much better state management system and more consistent action handling
