import {Component, createContext} from 'react'
import {feature} from 'topojson'
import h from 'react-hyperscript'
import {get} from 'axios'
import update from 'immutability-helper'

ColumnDataContext = createContext({})

class APIManager
  constructor: (@baseURL)->
  get: (route)=>
    # Should handle unsuccessful queries
    URI = @baseURL+route
    {data: {success: {data}}} = await get URI
    return data

getID = (col)->
  col.properties.col_id

class ColumnDataManager extends Component
  API: new APIManager("https://dev.macrostrat.org/api/v2")
  state: {
    hoveredColumn: null,
    columns: []
    selection: new Set([])
    columnUnitIndex: {}
  }
  constructor: (props)->
    super props
  getColumnData: ->
    data = await @API.get "/columns?format=topojson&all"
    {features: columns} = feature(data, data.objects.output)
    @setState {columns}

  cacheUnitsForColumn: (column)->
    id = getID(column)
    {columnUnitIndex} = @state
    return if columnUnitIndex[id]?
    data = await @API.get "/units?col_id=#{id}&response=long"
    console.log data
    c = {}
    c[id] = {$set: data}
    changeset = {columnUnitIndex: c}
    state = update(@state, changeset)
    @setState state

  render: ->
    {children} = @props
    {toggleSelected, getUnits} = @
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
        getUnits
        getID
      }
    }
    h ColumnDataContext.Provider, {value, children}
  componentDidMount: ->
    @getColumnData()
  setHoveredColumn: (col)=>
    @setState {hoveredColumn: col}

  toggleSelected: (col)=>
    if @isSelected(col)
      selection = {$remove: [col]}
    else
      selection = {$add: [col]}
      @cacheUnitsForColumn(col)
    changeset = {selection}
    newState = update(@state, changeset)
    @setState newState

  isSelected: (col)=>@state.selection.has(col)

  helpers: {
    isSame: (col1, col2)->
      # Checks if two columns are the same
      return false unless col1?
      return false unless col2?
      getID(col1) == getID(col2)
  }

  getUnits: (col)=>
    id = getID(col)
    {columnUnitIndex} = @state
    columnUnitIndex[id] or null

ColumnDataConsumer = ColumnDataContext.Consumer
export {ColumnDataConsumer, ColumnDataManager}
