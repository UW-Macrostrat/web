import { settings } from "./utils";
import axios from "axios";

export const fetchBurwellMapData = async () => {
  const url = `${settings.uri}/api/v2/defs/sources?all&format=geojson_bare`;

  const res = await axios.get(url, { responseType: "json" });
  return res.data.features;
};
