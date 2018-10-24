import {get} from 'axios'
import React, {Component} from 'react'

import {ColumnDataManager} from './column-data'
import ColumnIndexMap from './column-map'
import './main.styl'

class ColumnPage extends Component
  render: ->
    <ColumnDataManager>
      <div id="column-page">
        <ColumnIndexMap />
        <div className="header">
          <h1>Macrostrat <span className="subtitle">Column Explorer</span></h1>
        </div>
      </div>
    </ColumnDataManager>
  componentDidMount: ->
    # This is a hack to prevent long hash strings from moving
    # over from the geologic map side of the app
    window.location.hash = ""

export default ColumnPage

