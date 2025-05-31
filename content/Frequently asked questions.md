> [!question] I am interested in downloading the data from a search I ran on
> Macrostrat to import into ArcGIS. For example, if I searched "basalt", how
> might I be able to download the results as GIS metadata?

We don’t have a great way to bulk-download data in a form suitable for ArcGIS
(yet; we are working on it). Part of the problem is that our GIS dataset is
huge, so it’s usually easier to stream it from the web. For now, there are a few
options:

- There is a way to view our layers directly in QGIS and filter/style them by
  their attributes (using the QGIS filter functions). Unfortunately this doesn’t
  work in ArcGIS. But you can pretty easily apply different styles and
  categories to make the thematic map you desire.
- [macrostratpy](https://github.com/DARPA-CRITICALMAAS/macrostratpy) is a
  prototype library to download Macrostrat tiles over large areas into a
  GIS-ready GeoPackage format. Right now it’s difficult to use but we hope to
  improve that over time.
