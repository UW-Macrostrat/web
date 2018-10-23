
import React from 'react'

import ColumnIndexMap from './column-map'
import './main.styl'

class ColumnPage extends React.Component
  render: ->
    <div id="column-page">
      <div className="header">
        <h1>Macrostrat <span className="subtitle">Column Explorer</span></h1>
      </div>
      <ColumnIndexMap />
    </div>
  componentDidMount: ->
    # This is a hack to prevent long hash strings from moving
    # over from the geologic map side of the app
    window.location.hash = ""

export default ColumnPage

