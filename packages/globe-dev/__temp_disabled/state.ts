import {
  reducer as globeReducer,
  GlobeAction,
  GlobeState,
  createInitialState,
  DisplayQuality,
  nadirCameraParams,
  flyToParams,
  translateCameraPosition,
} from "@macrostrat/cesium-viewer";
import { LocalStorage } from "@macrostrat/ui-components";

const globeStorage = new LocalStorage("macrostrat-globe");

function getInitialGlobeState() {
  const { displayQuality = DisplayQuality.Low } = globeStorage.get() ?? {};
  return createInitialState({ displayQuality });
}

export function storageGlobeReducer(
  state = getInitialGlobeState(),
  action: GlobeAction
) {
  if (action.type === "set-display-quality") {
    globeStorage.set({ displayQuality: action.value });
  }

  return globeReducer(state, action);
}
