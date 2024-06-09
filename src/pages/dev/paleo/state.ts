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
  modelName: string;
  age: number;
  mapPosition: MapPosition;
};

type PaleogeographyState = MapState & {
  initialized: boolean;
  allModels: ModelInfo[];
  activeModel: ModelInfo | null;
};

type ModelInfo = { id: number; max_age: number; min_age: number; name: string };

type PaleogeographySyncAction =
  | { type: "set-model"; modelID: number }
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
      const activeModel = state.allModels.find((d) => d.id == action.modelID);
      return updateHashString({
        ...state,
        activeModel,
        modelName: activeModel?.name ?? state.modelName,
        age: normalizeAge(state.age, activeModel),
      });
    case "set-age":
      // Round to nearest 5 Ma
      return updateHashString({
        ...state,
        age: normalizeAge(action.age, state.activeModel),
      });
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

      const { model, age, ...rest } = hashData;
      const mapPosition = getMapPositionForHash(
        rest,
        defaultState.mapPosition.camera
      );

      const modelsURL = burwellTileDomain + "/carto/rotation-models";
      const models: ModelInfo[] = await fetch(modelsURL).then((res) =>
        res.json()
      );

      let modelName: string | null = null;
      if (Array.isArray(model)) {
        modelName = model[0];
      } else if (model != null) {
        modelName = model;
      } else {
        modelName = "Seton2012";
      }

      let baseAge: number | null = null;
      if (Array.isArray(age)) {
        baseAge = parseInt(age[0]);
      } else if (age != null) {
        baseAge = parseInt(age);
      }

      console.log(age, baseAge);

      const activeModel = models.find((d) => d.name == modelName);

      return {
        type: "set-initial-state",
        state: {
          modelName,
          age: normalizeAge(baseAge, activeModel),
          mapPosition,
          allModels: models,
          activeModel,
          initialized: true,
        },
      };
  }
  return action;
}

function normalizeAge(age: number | null, model: ModelInfo | null): number {
  if (model == null) return age;
  let age1 = age ?? 0;
  age1 = Math.max(model.min_age, Math.min(model.max_age, age));
  // Round age to nearest 5 Ma
  return Math.round(age1 / 5) * 5;
}

const defaultState: PaleogeographyState = {
  modelName: "Seton2012",
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
  const { modelName, age, mapPosition } = state;
  let args: any = { model: modelName, age };
  applyMapPositionToHash(args, mapPosition);
  setHashString(args, { sort: false, arrayFormat: "comma" });
  return state;
}
