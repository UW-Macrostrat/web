import {
  applyMapPositionToHash,
  getMapPositionForHash,
} from "@macrostrat/map-interface";
import { MapPosition } from "@macrostrat/mapbox-utils";
import { getHashString, setHashString } from "@macrostrat/ui-components";
import { useEffect, useReducer } from "react";

// Import other components

type PaleogeographyState = {
  model_id: number;
  age: number;
  mapPosition: MapPosition;
  initialized: boolean;
};

type PaleogeographyAction =
  | { type: "set-model"; model_id: number }
  | { type: "set-age"; age: number }
  | { type: "set-map-position"; mapPosition: MapPosition }
  | { type: "initialize"; state: PaleogeographyState };

function paleogeographyReducer(
  state: PaleogeographyState,
  action: PaleogeographyAction
): PaleogeographyState {
  switch (action.type) {
    case "set-model":
      return {
        ...state,
        model_id: action.model_id,
        age: state.age ?? defaultAge,
      };
    case "set-age":
      // Round to nearest 5 Ma
      const age = Math.round(action.age / 5) * 5;
      return { ...state, age };
    case "set-map-position":
      return { ...state, mapPosition: action.mapPosition };
    case "initialize":
      return { ...action.state, initialized: true };
  }
}

export function usePaleogeographyState(
  defaultState: PaleogeographyState
): [PaleogeographyState, (s: PaleogeographyAction) => void] {
  /** Use state synced with hash string for paleogeography layer */
  const defaultModelID = defaultState.model_id;
  const defaultAge = defaultState.age;

  const [state, dispatch] = useReducer(paleogeographyReducer, {
    model_id: null,
    age: null,
    mapPosition: null,
    initialized: false,
  });

  const { model_id, age, mapPosition } = state;

  useEffect(() => {
    if (model_id == null || age == null || mapPosition == null) return;
    let args: any = { model_id, age };
    applyMapPositionToHash(args, mapPosition);
    setHashString(args, { sort: false, arrayFormat: "comma" });
  }, [model_id, age, mapPosition]);

  useEffect(() => {
    const hashData = getHashString(window.location.hash) ?? {};
    const { model_id, age, ...rest } = hashData;
    const mapPosition = getMapPositionForHash(
      rest,
      defaultState.mapPosition.camera
    );

    if (model_id == null || age == null) return;
    if (Array.isArray(model_id)) return;
    if (Array.isArray(age)) return;
    dispatch({
      type: "initialize",
      state: {
        model_id: parseInt(model_id) ?? defaultModelID,
        age: parseInt(age) ?? defaultAge,
        mapPosition,
        initialized: true,
      },
    });
  }, []);

  return [state, dispatch];
}
