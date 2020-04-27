import {
  BrowserRouter as Router,
  Route,
  Redirect
} from 'react-router-dom'
import h from '@macrostrat/hyper'

import '../styles/index.styl'
import MapPage from './components/MapPage'
import CesiumTestMapPage from './3d-map'
//import ColumnPage from '../../columns'

const App = ()=>{
  return h(Router, [
    h('div#app-holder', [
      h(Route, {path: "/map", component: MapPage}),
      h(Route, {path: "/3d", component: CesiumTestMapPage}),
      h(Route, {exact: true, path: "/", render: () => h(Redirect, {to: "/map"})})
    ])
  ])
}

export default App
