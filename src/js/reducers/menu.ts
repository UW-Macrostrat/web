enum MenuPanel {
  LAYERS,
  SETTINGS,
  ABOUT
}

type MenuAction = {
  type: 'set-panel',
  panel: MenuPanel
}

type MenuState = {
  activePanel: MenuPanel
}

const initialState = {
  activePanel: MenuPanel.LAYERS
}

const reducer = (state: MenuState = initialState, action: MenuAction)=>{
  switch (action.type) {
  case 'set-panel':
    return {...state, activePanel: action.panel}
  default:
    return state  
  }
}

export {reducer as menuReducer, MenuAction, MenuState, MenuPanel}
