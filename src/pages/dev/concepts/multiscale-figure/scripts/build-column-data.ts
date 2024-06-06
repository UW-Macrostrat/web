import { writeJSON } from "./utils";
import { buildMacrostratMeasurements } from "../data-providers/reclassify-measurements";
import { apiBaseURL } from "../config";

buildMacrostratMeasurements(
  apiBaseURL,
  {
    col_id: 2163,
    project_id: 10,
    status_code: "in process"
  },
  { col_id: 1481 }
).then(data => {
  writeJSON("macrostrat/measurements", data);
});
