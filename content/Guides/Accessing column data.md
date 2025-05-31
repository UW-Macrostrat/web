Information about Macrostrat columns can be accessed through our
[API](https://macrostrat.org/api/).

# Column footprints

Column footprints can be downloaded for some or all Macrostrat columns through
the [`/columns`](https://macrostrat.org/api/columns) API route. This API route
can be filtered by many parameters, which drives
[[Macrostrat column filtering]].

- The `all` query parameter will download all columns
- The output format can be controlled with the `format` parameter, with options
  `json`, `csv`, `geojson`, `geojson_bare`, `topojson`, and `topojson_bare`.
- `geojson_bare` files can be opened directly in GIS software such as
  [QGIS](https://qgis.org)
- Not all Macrostrat columns are in our core column dataset. Other columns are
  held in different "projects," which can be specified using the `project_id`
  query parameter. Available projects can be found at the
  [Projects API route](https://macrostrat.org/api/defs/projects?all).

## Column units

Macrostrat column units drive the Macrostrat column visualization
