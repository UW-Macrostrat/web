import {Component} from 'react'
import h from 'react-hyperscript'

class ColumnIndexMap extends Component
  render: ->
    h 'svg#index-map', {
      xmlns: "http://www.w3.org/2000/svg"
      width: window.innerWidth
      height: 300
    }

export default ColumnIndexMap
