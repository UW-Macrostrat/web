import {
  applyMapPositionToHash,
  getMapPositionForHash,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import { useCallback, useEffect, useReducer } from "react";
import { burwellTileDomain } from "@macrostrat-web/settings";

// Import other components

type MapState = {
  model_id: number;
  age: number;
  mapPosition: MapPosition;
};

type PaleogeographyState = MapState & {
  initialized: boolean;
  allModels: ModelInfo[];
  activeModel: ModelInfo | null;
};

type ModelInfo = { id: string; max_age: number; min_age: number; name: string };

type PaleogeographySyncAction =
  | { type: "set-model"; model_id: number }
  | { type: "set-age"; age: number }
  | { type: "set-map-position"; mapPosition: MapPosition }
  | { type: "set-initial-state"; state: PaleogeographyState };

type PaleogeographyAction = PaleogeographySyncAction | { type: "initialize" };

function paleogeographyReducer(
  state: PaleogeographyState = defaultState,
  action: PaleogeographySyncAction
): PaleogeographyState {
  switch (action.type) {
    case "set-model":
      return updateHashString({
        ...state,
        model_id: action.model_id,
      });
    case "set-age":
      // Round to nearest 5 Ma
      const age = Math.round(action.age / 5) * 5;
      return updateHashString({ ...state, age });
    case "set-map-position":
      return updateHashString({ ...state, mapPosition: action.mapPosition });
    case "set-initial-state":
      return { ...state, ...action.state, initialized: true };
  }
}

async function transformAction(
  action: PaleogeographyAction
): Promise<PaleogeographySyncAction> {
  switch (action.type) {
    case "initialize":
      const hashData = getHashString(window.location.hash);
      console.log("Hash data", hashData);

      const { model_id, age, ...rest } = hashData;
      const mapPosition = getMapPositionForHash(
        rest,
        defaultState.mapPosition.camera
      );

      const modelsURL = burwellTileDomain + "/carto/rotation-models";
      const models: ModelInfo[] = await fetch(modelsURL).then((res) =>
        res.json()
      );

      return {
        type: "set-initial-state",
        state: {
          model_id: parseInt(model_id) ?? 3,
          age: parseInt(age) ?? 0,
          mapPosition,
          allModels: models,
          activeModel: models.find((d) => d.id == model_id),
          initialized: true,
        },
      };
  }
  return action;
}

const defaultState: PaleogeographyState = {
  model_id: 3,
  age: 0,
  mapPosition: {
    camera: {
      lng: -40,
      lat: 45,
      altitude: 5000000,
    },
  },
  initialized: false,
  allModels: [],
  activeModel: null,
};

export function usePaleogeographyState(): [
  PaleogeographyState,
  (s: PaleogeographyAction) => void
] {
  /** Use state synced with hash string for paleogeography layer */

  const [state, dispatch] = useReducer(paleogeographyReducer, defaultState);

  // convert to zustand or something...
  const actionRunner = useCallback(
    (action: PaleogeographyAction) => {
      transformAction(action).then((a) => dispatch(a));
    },
    [dispatch]
  );

  useEffect(() => {
    actionRunner({
      type: "initialize",
    });
  }, []);

  return [state, actionRunner];
}

function updateHashString(state: PaleogeographyState): PaleogeographyState {
  const { model_id, age, mapPosition } = state;
  let args: any = { model_id, age };
  applyMapPositionToHash(args, mapPosition);
  setHashString(args, { sort: false, arrayFormat: "comma" });
  return state;
}
