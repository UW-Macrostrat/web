// Settings panel for the map

import h from '@macrostrat/hyper'
import {GlobeSettings} from '../map-page/cesium-view/settings'

const SettingsPanel = (props)=>{
  return h("div.settings", [
    h(GlobeSettings)
  ])
}

export {SettingsPanel}
