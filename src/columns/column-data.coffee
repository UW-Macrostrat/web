import {Component, createContext} from 'react'
import {feature} from 'topojson'
import h from 'react-hyperscript'
import {get} from 'axios'

ColumnDataContext = createContext({})

class ColumnDataManager extends Component
  state: {
    hoveredColumn: null,
    columns: []
    selection: new Set([])
  }
  constructor: (props)->
    super props
  getColumnData: ->
    __ = "https://dev.macrostrat.org/api/v2/columns?format=topojson&all"
    {data: {success: {data}}} = await get __
    {features: columns} = feature(data, data.objects.output)
    @setState {columns}
  render: ->
    {children} = @props
    {toggleSelected} = @
    value = {
      @state...,
      # Could generalize into a `dispatch` function
      # https://dev.to/washingtonsteven/reacts-new-context-api-and-actions-446o
      actions: {
        setHovered: @setHoveredColumn
        setSelected: @setSelectedColumn
        toggleSelected
      }
      helpers: {
        @helpers...
        isSelected: @isSelected
      }
    }
    h ColumnDataContext.Provider, {value, children}
  componentDidMount: ->
    @getColumnData()
  setHoveredColumn: (col)=>
    @setState {hoveredColumn: col}

  setSelectedColumn: (col)=>

  toggleSelected: (col)=>
    {selection} = @state
    hadItem = selection.delete(col)
    if not hadItem
      selection = selection.add(col)
    @setState {selection}

  isSelected: (col)=>@state.selection.has(col)

  helpers: {
    isSame: (col1, col2)->
      # Checks if two columns are the same
      return false unless col1?
      return false unless col2?
      col1.properties.col_id == col2.properties.col_id
  }

ColumnDataConsumer = ColumnDataContext.Consumer
export {ColumnDataConsumer, ColumnDataManager}
