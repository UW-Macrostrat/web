import { BurwellSourceActions as Action, BurwellState } from "./types";
import { fetchBurwellMapData } from "./fetch";

async function actionRunner(action: Action): Promise<Action | void> {
  switch (action.type) {
    case "fetch-data":
      const data = await fetchBurwellMapData();
      return { type: "recieve-data", maps: data };
    default:
      return action;
  }
}

export default actionRunner;
