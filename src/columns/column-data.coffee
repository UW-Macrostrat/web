import {Component, createContext} from 'react'
import {feature} from 'topojson'
import h from 'react-hyperscript'
import {get} from 'axios'

ColumnDataContext = createContext({})

class ColumnDataManager extends Component
  constructor: (props)->
    super props
    @state = {hoveredColumn: null, columns: []}
  getColumnData: ->
    __ = "https://dev.macrostrat.org/api/v2/columns?format=topojson&all"
    {data: {success: {data}}} = await get __
    {features: columns} = feature(data, data.objects.output)
    @setState {columns}
  render: ->
    {children} = @props
    value = {@state...}
    h ColumnDataContext.Provider, {value, children}
  componentDidMount: ->
    @getColumnData()

ColumnDataConsumer = ColumnDataContext.Consumer
export {ColumnDataConsumer, ColumnDataManager}
