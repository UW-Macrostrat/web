type SetExaggeration = {
  type: "set-exaggeration";
  value: number;
};

enum DisplayQuality {
  High = "high",
  Low = "low",
}

type SetDisplayQuality = {
  type: "set-display-quality";
  value: DisplayQuality;
};

type SetShowInspector = {
  type: "set-show-inspector";
  value: boolean;
};

type GlobeAction = SetExaggeration | SetDisplayQuality | SetShowInspector;

interface GlobeState {
  verticalExaggeration: number;
  displayQuality: DisplayQuality;
}

const initialState = {
  verticalExaggeration: 1,
  displayQuality: DisplayQuality.Low,
};

const reducer = (state: GlobeState = initialState, action: GlobeAction) => {
  switch (action.type) {
    case "set-exaggeration":
      return { ...state, verticalExaggeration: action.value };
    case "set-display-quality":
      return { ...state, displayQuality: action.value };
    case "set-show-inspector":
      return { ...state, showInspector: action.value };
    default:
      return state;
  }
};

export { reducer as globeReducer, GlobeAction, DisplayQuality };
