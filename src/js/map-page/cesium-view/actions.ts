type SetExaggeration = {
  type: 'set-exaggeration',
  value: number
}

type GlobeAction = SetExaggeration

interface GlobeState {
  verticalExaggeration: number
}

const initialState = {
  verticalExaggeration: 1
}

const reducer = (state: GlobeState = initialState, action: GlobeAction)=>{
  switch (action.type) {
  case 'set-exaggeration':
    return {...state, verticalExaggeration: action.value}
  default:
    return state
  }
}

export {reducer as globeReducer, GlobeAction}
