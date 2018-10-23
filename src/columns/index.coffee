
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

export default ColumnPage

