import { BurwellSourceActions as Action, BurwellState } from "./types";
import axios from "axios";
import { apiV2Prefix } from "@macrostrat-web/settings";

async function actionRunner(action: Action): Promise<Action | void> {
  switch (action.type) {
    case "fetch-data":
      const data = await fetchBurwellMapData();
      return { type: "recieve-data", maps: data };
    default:
      return action;
  }
}

async function fetchBurwellMapData() {
  const url = `${apiV2Prefix}/defs/sources`;

  const res = await axios.get(url, {
    responseType: "json",
    params: { all: true, format: "geojson_bare" },
  });
  return res.data.features;
}

export default actionRunner;
