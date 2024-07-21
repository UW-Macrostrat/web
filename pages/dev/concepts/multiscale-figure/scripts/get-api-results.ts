import axios from "axios";
import { writeJSON } from "./utils";

const apiBaseURL = "https://dev.macrostrat.org/api/v2";

const apiParams = {
  "macrostrat/column-units": "/units?all=true&col_id=1481&response=long",
  "macrostrat/all-columns.topo": "/columns?all=true&format=topojson",
  "macrostrat/column.geo": "/columns?col_id=1481&format=geojson",
  "world-map": "https://unpkg.com/world-atlas@1.1.4/world/110m.json",
  "regional/column-units":
    "/units?all=true&col_id=2163&project_id=10&response=long&status_code=in%20process",
  "regional/all-measurements.geo":
    "/measurements?format=geojson&project_id=10&response=light&status_code=in%20process",
  "regional/all-columns.topo":
    "/columns?format=topojson&project_id=10&status_code=in%20process",
  "regional/column-measurements":
    "/measurements?col_id=2163,2164,2158,2159&project_id=10&response=long&show_values=true&status_code=in%20process",
  "regional/column.geo":
    "/columns?col_id=2163&format=geojson&project_id=10&status_code=in%20process"
};

for (let key in apiParams) {
  let url = apiParams[key];
  if (!url.startsWith("http")) {
    url = apiBaseURL + url;
  }
  const promise = axios.get(url);
  promise.then(response => {
    writeJSON(key, response.data);
  });
}
