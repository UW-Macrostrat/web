import {Component, createContext} from 'react'
import {feature} from 'topojson'
import h from 'react-hyperscript'
import {withCookies, Cookies} from 'react-cookie'
import {get} from 'axios'
import {instanceOf} from 'prop-types'
import update from 'immutability-helper'

MacrostratColumnContext = createContext({})

class APIManager
  constructor: (@baseURL)->
  get: (route)=>
    # Should handle unsuccessful queries
    URI = @baseURL+route
    {data: {success: {data}}} = await get URI
    return data

getID = (col)->
  # This maps column objects to IDs
  # and transparently passes IDs forward
  if typeof col =='number'
    # We were passed the ID
    return col
  col.properties.col_id

class MacrostratColumnManager extends Component
  API: new APIManager("https://dev.macrostrat.org/api/v2")
  @propTypes: {
    cookies: instanceOf(Cookies).isRequired
  }
  state: {
    hoveredColumn: null,
    columns: []
    columnUnitIndex: {}
  }

  constructor: (props)->
    super props
    {cookies} = @props

    # Create `selection` as a set of IDs, which will
    # be mapped out to objects when provided
    selectedIDs = cookies.get('selected-columns') or []
    @state.selection = new Set(selectedIDs)
    selectedIDs.map @cacheUnitsForColumn

  getColumnData: ->
    data = await @API.get "/columns?format=topojson&all"
    {features: columns} = feature(data, data.objects.output)
    @setState {columns}

  cacheUnitsForColumn: (column)=>
    id = getID(column)
    {columnUnitIndex} = @state
    return if columnUnitIndex[id]?
    data = await @API.get "/units?col_id=#{id}&response=long"
    c = {}
    c[id] = {$set: data}
    changeset = {columnUnitIndex: c}
    state = update(@state, changeset)
    @setState state

  render: ->
    {children} = @props
    {toggleSelected, getUnits} = @
    # We store selected IDs but we provide objects
    {selection, rest...} = @state
    selection = @state.columns.filter (col)=>
      id = getID(col)
      @state.selection.has(id)

    value = {
      rest...,
      selection
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
    h MacrostratColumnContext.Provider, {value, children}
  componentDidMount: ->
    @getColumnData()

  componentDidUpdate: (prevProps, prevState)->
    # Update cookie for selection
    {cookies} = @props
    {selection} = @state
    {selection: oldSelection} = prevState
    if selection != oldSelection
      cookies.set('selected-columns',selection)

  setHoveredColumn: (col)=>
    @setState {hoveredColumn: col}

  toggleSelected: (col)=>
    id = getID(col)
    if @isSelected(id)
      selection = {$remove: [id]}
    else
      selection = {$add: [id]}
      @cacheUnitsForColumn(id)
    changeset = {selection}
    newState = update(@state, changeset)
    @setState newState

  isSelected: (col)=>
    id = getID(col)
    @state.selection.has(id)

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

# Wrap column manager for cookie access
MacrostratColumnManager = withCookies(MacrostratColumnManager)

MacrostratColumnConsumer = MacrostratColumnContext.Consumer
export {MacrostratColumnConsumer, MacrostratColumnManager}
