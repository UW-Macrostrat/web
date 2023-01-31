import { FilterData } from "~/map-interface/app-state/handlers/filters";
import { SETTINGS } from "../../Settings";

/**
 * Gets the removed or added filters and mutates list
 * @param nextProps
 * @returns void
 */
function getRemovedOrNewFilters(nextProps, map) {
  let existingFilters = new Set(
    map.props.filters.map((f) => {
      return `${f.category}|${f.type}|${f.name}`;
    })
  );
  let newFilters = new Set(
    nextProps.filters.map((f) => {
      return `${f.category}|${f.type}|${f.name}`;
    })
  );

  let incoming = [
    ...new Set([...newFilters].filter((f) => !existingFilters.has(f))),
  ];
  let outgoing = [
    ...new Set([...existingFilters].filter((f) => !newFilters.has(f))),
  ];

  // if a filter was removed
  if (outgoing.length) {
    switch (outgoing[0].split("|")[0]) {
      case "interval":
        var idx = map.timeFiltersIndex[outgoing[0]];
        map.timeFilters.splice(idx, 1);
        delete map.timeFiltersIndex[outgoing[0]];
        break;
      case "lithology":
        // Remove it from our lith filter index
        var idx = map.lithFiltersIndex[outgoing[0]];
        map.lithFilters.splice(idx, 1);
        delete map.lithFiltersIndex[outgoing[0]];
        // Remove it from the general filter index
        map.filtersIndex[outgoing[0]].reverse().forEach((idx) => {
          map.filters.splice(idx, 1);
        });
        delete map.filtersIndex[outgoing[0]];

        break;
      case "strat_name":
        // Remove it from the strat name filter index
        var idx = map.stratNameFiltersIndex[outgoing[0]];
        map.stratNameFilters.splice(idx, 1);
        delete map.stratNameFiltersIndex[outgoing[0]];
        // Remove it from the general filter index
        map.filtersIndex[outgoing[0]].reverse().forEach((idx) => {
          map.filters.splice(idx, 1);
        });
        delete map.filtersIndex[outgoing[0]];
        break;
    }
  }
  // Otherwise, a filter was added
  if (incoming.length > 0) {
    let newFilterString = incoming[0].split("|");
    let filterToApply = nextProps.filters.filter((f) => {
      if (
        f.category === newFilterString[0] &&
        f.type === newFilterString[1] &&
        f.name === newFilterString[2]
      ) {
        return f;
      }
    });
    if (filterToApply.length === 0) {
      return false;
    }
    filterToApply = filterToApply[0];

    // Check which kind of filter it is
    switch (filterToApply.type) {
      case "intervals":
        map.timeFilters.push([
          "all",
          [">", "best_age_bottom", filterToApply.t_age],
          ["<", "best_age_top", filterToApply.b_age],
        ]);
        map.timeFiltersIndex[
          `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
        ] = map.timeFilters.length - 1;
        break;

      case "lithology_classes":
        map.lithFilters.push(filterToApply.name);
        map.lithFiltersIndex[
          `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
        ] = map.lithFilters.length - 1;

        for (let i = 1; i < 14; i++) {
          map.filters.push(["==", `lith_class${i}`, filterToApply.name]);
          if (
            map.filtersIndex[
              `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
            ]
          ) {
            map.filtersIndex[
              `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
            ].push(map.filters.length - 1);
          } else {
            map.filtersIndex[
              `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
            ] = [map.filters.length - 1];
          }
        }
        break;

      case "lithology_types":
        map.lithFilters.push(filterToApply.name);
        map.lithFiltersIndex[
          `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
        ] = map.lithFilters.length - 1;

        for (let i = 1; i < 14; i++) {
          map.filters.push(["==", `lith_type${i}`, filterToApply.name]);

          if (
            map.filtersIndex[
              `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
            ]
          ) {
            map.filtersIndex[
              `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
            ].push(map.filters.length - 1);
          } else {
            map.filtersIndex[
              `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
            ] = [map.filters.length - 1];
          }
        }
        break;

      case "lithologies":
      case "all_lithologies":
      case "all_lithology_types":
      case "all_lithology_classes":
        map.lithFilters.push(filterToApply.name);
        map.lithFiltersIndex[
          `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
        ] = map.lithFilters.length - 1;
        map.filters.push(["in", "legend_id", ...filterToApply.legend_ids]);
        map.filtersIndex[
          `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
        ] = [map.filters.length - 1];
        break;

      case "strat_name_orphans":
      case "strat_name_concepts":
        map.stratNameFilters.push(filterToApply.name);
        map.stratNameFiltersIndex[
          `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
        ] = map.stratNameFilters.length - 1;

        map.filters.push(["in", "legend_id", ...filterToApply.legend_ids]);
        map.filtersIndex[
          `${filterToApply.category}|${filterToApply.type}|${filterToApply.name}`
        ] = [map.filters.length - 1];
        break;
    }
  }
}

/**
 * Helper function for apply function
 * @param map
 * @returns []
 */
function getToApply(map): (string | string[])[] {
  let toApply = ["all", ["!=", "color", ""]];
  if (map.timeFilters.length) {
    toApply.push(["any", ...map.timeFilters]);
  }
  if (map.filters.length) {
    toApply.push(["any", ...map.filters]);
  }
  return toApply;
}

// function buildFilterDef(filter: FilterData): mapboxgl.Expression {
//   switch (filter.type) {
//     case "intervals":
//       return [
//         "all",
//         [">", "best_age_bottom", filter.t_age],
//         ["<", "best_age_top", filter.b_age],
//       ];
//     case "lithology_classes":
//     case "lithology_types":
//       return ["in", filter.name, ...filter.legend_ids];
//     case "lithologies":
//     case "all_lithologies":
//     case "all_lithology_types":
//     case "all_lithology_classes":
//       return ["in", "legend_id", ...filter.legend_ids];
//     case "strat_name_concepts":
//     case "strat_name_orphans":
//       return ["in", "legend_id", ...filter.legend_ids];
//   }
// }

function PBDBHelper(map, bounds, zoom, maxClusterZoom = 7): void {
  // One for time, one for everything else because
  // time filters require a separate request for each filter
  let timeQuery = [];
  let queryString = [];

  if (map.timeFilters.length) {
    map.timeFilters.forEach((f) => {
      timeQuery.push(`max_ma=${f[2][2]}`, `min_ma=${f[1][2]}`);
    });
  }
  // lith filters broken on pbdb (500 error returned)
  // if (map.lithFilters.length) {
  //   let filters = map.lithFilters.filter((f) => f != "sedimentary");
  //   if (filters.length) {
  //     queryString.push(`lithology=${filters.join(",")}`);
  //   }
  // }
  if (map.stratNameFilters.length) {
    queryString.push(`strat=${map.stratNameFilters.join(",")}`);
  }

  // Define the pbdb cluster level
  let level = zoom < 3 ? "&level=2" : "&level=3";

  let urls = [];
  // Make sure lngs are between -180 and 180
  const lngMin = bounds._sw.lng < -180 ? -180 : bounds._sw.lng;
  const lngMax = bounds._ne.lng > 180 ? 180 : bounds._ne.lng;
  // If more than one time filter is present, multiple requests are needed

  /* Currently there is a limitation in the globe for the getBounds function that
  resolves incorrect latitude ranges for low zoom levels.
  - https://docs.mapbox.com/mapbox-gl-js/guides/globe/#limitations-of-globe
  - https://github.com/mapbox/mapbox-gl-js/issues/11795
  -   https://github.com/UW-Macrostrat/web/issues/68

  This is a workaround for that issue.
  */
  let latMin = bounds._sw.lat;
  let latMax = bounds._ne.lat;

  if (zoom < 5) {
    latMin = Math.max(Math.min(latMin, latMin * 5), -85);
    latMax = Math.min(Math.max(latMax, latMax * 5), 85);
  }

  console.log(latMin, latMax);

  if (map.timeFilters.length && map.timeFilters.length > 1) {
    urls = map.timeFilters.map((f) => {
      let url = `${SETTINGS.pbdbDomain}/data1.2/colls/${
        zoom < maxClusterZoom ? "summary" : "list"
      }.json?lngmin=${lngMin}&lngmax=${lngMax}&latmin=${latMin}&latmax=${latMax}&max_ma=${
        f[2][2]
      }&min_ma=${f[1][2]}${zoom < maxClusterZoom ? level : ""}`;
      if (queryString.length) {
        url += `&${queryString.join("&")}`;
      }
      return url;
    });
  } else {
    let url = `${SETTINGS.pbdbDomain}/data1.2/colls/${
      zoom < maxClusterZoom ? "summary" : "list"
    }.json?lngmin=${lngMin}&lngmax=${lngMax}&latmin=${latMin}&latmax=${latMax}${
      zoom < maxClusterZoom ? level : ""
    }`;
    if (timeQuery.length) {
      url += `&${timeQuery.join("&")}`;
    }
    if (queryString.length) {
      url += `&${queryString.join("&")}`;
    }
    urls = [url];
  }

  // Fetch the data
  Promise.all(
    urls.map((url) => fetch(url).then((response) => response.json()))
  ).then((responses) => {
    // Ignore data that comes with warnings, as it means nothing was
    // found under most conditions
    let data = responses
      .filter((res) => {
        if (!res.warnings) return res;
      })
      .map((res) => res.records)
      .reduce((a, b) => {
        return [...a, ...b];
      }, []);

    map.pbdbPoints = {
      type: "FeatureCollection",
      features: data.map((f, i) => {
        return {
          type: "Feature",
          properties: f,
          id: i,
          geometry: {
            type: "Point",
            coordinates: [f.lng, f.lat],
          },
        };
      }),
    };
    // Show or hide the proper PBDB layers
    if (zoom < maxClusterZoom) {
      map.map.getSource("pbdb-clusters").setData(map.pbdbPoints);
      map.map.setLayoutProperty("pbdb-clusters", "visibility", "visible");
      map.map.setLayoutProperty("pbdb-points-clustered", "visibility", "none");
      //  map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'none')
      map.map.setLayoutProperty("pbdb-points", "visibility", "none");
    } else {
      map.map.getSource("pbdb-points").setData(map.pbdbPoints);

      //map.map.getSource("pbdb-clusters").setData(map.pbdbPoints);
      map.map.setLayoutProperty("pbdb-clusters", "visibility", "none");
      map.map.setLayoutProperty(
        "pbdb-points-clustered",
        "visibility",
        "visible"
      );
      //    map.map.setLayoutProperty('pbdb-point-cluster-count', 'visibility', 'visible')
      // map.map.setLayoutProperty("pbdb-points", "visibility", "visible");
    }
  });
}

export { getRemovedOrNewFilters, getToApply, PBDBHelper };
