import {get} from 'axios'
import {feature} from 'topojson'
import React from 'react'

import ColumnIndexMap from './column-map'
import './main.styl'

class ColumnPage extends React.Component
  constructor: (props)->
    super props
    @state = {columns: []}

  getColumnData: ->
    __ = "https://dev.macrostrat.org/api/v2/columns?format=topojson&all"
    {data: {success: {data}}} = await get __
    {features: columns} = feature(data, data.objects.output)
    @setState {columns}

  render: ->
    {columns} = @state
    <div id="column-page">
      <ColumnIndexMap columns={columns} />
      <div className="header">
        <h1>Macrostrat <span className="subtitle">Column Explorer</span></h1>
      </div>
    </div>
  componentDidMount: ->
    # This is a hack to prevent long hash strings from moving
    # over from the geologic map side of the app
    window.location.hash = ""
    @getColumnData()

export default ColumnPage

