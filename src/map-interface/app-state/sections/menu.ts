import { Panel } from "@blueprintjs/core";

enum MenuPanel {
  LAYERS = "layers",
  SETTINGS = "settings",
  ABOUT = "about",
  HELP = "help",
}

type SetPanel = {
  type: "set-panel";
  panel: MenuPanel;
};

type PushPanel = { type: "push-panel"; panel: Panel<{}> };
type ClosePanel = { type: "close-panel" };

type MenuAction = SetPanel | PushPanel | ClosePanel;

type MenuState = {
  activePanel: MenuPanel;
  panelStack: Panel<{}>[];
};

const initialState = {
  activePanel: MenuPanel.LAYERS,
  panelStack: [],
};

const reducer = (state: MenuState = initialState, action: MenuAction) => {
  switch (action.type) {
    case "set-panel":
      return { ...state, activePanel: action.panel, stack: [] };
    case "push-panel":
      return { ...state, panelStack: [...state.panelStack, action.panel] };
    case "close-panel":
      return { ...state, panelStack: state.panelStack.slice(0, -1) };
    default:
      return state;
  }
};

export { reducer as menuReducer, MenuAction, MenuState, MenuPanel };
