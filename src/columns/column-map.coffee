import {Component} from 'react'
import {findDOMNode} from 'react-dom'
import h from 'react-hyperscript'
import {ResizeSensor} from '@blueprintjs/core'
import {geoOrthographic, geoGraticule10, geoPath} from 'd3-geo'
import 'd3-jetpack'
import {select, event} from 'd3-selection'
import {drag} from 'd3-drag'
import {zoom} from 'd3-zoom'
import {get} from 'axios'
import {feature} from 'topojson'
import classNames from 'classnames'
import {ColumnDataConsumer} from './column-data.coffee'

class ColumnPath__ extends Component
  render: ->
    {actions, hoveredColumn, helpers, column} = @props
    hovered = helpers.isSame(column, hoveredColumn)
    selected = helpers.isSelected(column)
    className = classNames("column", {hovered, selected})
    h 'path', {
      className
      onMouseEnter: ->actions.setHovered(column)
      onMouseLeave: ->actions.setHovered()
    }
  componentDidMount: ->
    {column, actions} = @props
    select(findDOMNode(@))
      .datum(column)
      .on 'click', ->
        # This handler can't be in React because
        # stopPropagation can't be called before zoom handlers
        actions.toggleSelected(column)
        # Right now stopPropagation is not called properly
        event.stopPropagation()

ColumnPath = (props)=>
  h ColumnDataConsumer, null, ({actions, hoveredColumn, helpers})->
    h ColumnPath__, {props...,actions,hoveredColumn,helpers}

class ColumnIndexMap__ extends Component
  @defaultProps: {
    columns: []
  }
  constructor: (props)->
    super props
    width = window.innerWidth
    @state = @computeDerivedState({ width })

  computeDerivedState: (newState)->
    # Right now we derive the height of the component
    # from its width
    {width} = newState
    if width?
      height = width/6
      if height < 200
        height = 200
      hypot = Math.sqrt(Math.pow(width,2)+Math.pow(height,2))
      minScale = hypot/1.9
      newState = {height, minScale, newState...}
    return newState

  setState: (newState)->
    state = @computeDerivedState(newState)
    super state

  render: ->
    {columns} = @props
    {width,height} = @state
    h 'svg#column-index-map', {
      xmlns: "http://www.w3.org/2000/svg"
      width
      height
    }, [
      h 'g.map-backdrop'
      h 'g.columns', columns.map (column)->
        h ColumnPath, {column}
    ]

  setWidth: =>
    @setState {width: window.innerWidth}

  getColumns: =>
    {data: {success: {data}}} = await get "https://dev.macrostrat.org/api/v2/columns?format=topojson&all"
    columns = feature(data, data.objects.output)
    console.log columns
    sel = @columnContainer
      .appendMany('path.column', columns.features)
      .call @redrawPaths


  updateProjection: (prevProps, prevState)->
    if prevState?
      {width: prevWidth} = prevState
      return if @state.width == prevWidth
    {width,height, minScale} = @state
    @projection
      .translate([width / 2, height / 2])
      .scale minScale
      .clipExtent([[0,0],[width,height]])
    @redrawPaths()

  redrawPaths:(sel)=>
    return unless @map?
    sel ?= @map.selectAll('path')
    sel.attr 'd', @path

  componentDidUpdate: (prevProps, prevState)->
    @updateProjection(prevProps, prevState)
    if prevProps.columns != @props.columns
      @redrawPaths(@map.selectAll('path.column'))

  componentDidMount: ->
    window.addEventListener 'resize', @setWidth
    {width,height, minScale} = @state
    center = [-75, 33]

    @projection = geoOrthographic()
      .rotate([-center[0],-center[1]])
      .precision(0.2)
      .clipAngle(90)
    @updateProjection()

    # https://unpkg.com/world-atlas@1/world/110m.json
    el = findDOMNode(@)
    @map = select(el)

    bkg = @map.select("g.map-backdrop")

    # `await` does promises serially for now
    {data} = await get("https://unpkg.com/world-atlas@1/world/50m.json")
    land50 = feature(data, data.objects.land)

    {data} = await get("https://unpkg.com/world-atlas@1/world/110m.json")
    land110 = feature(data, data.objects.land)

    @path = geoPath()
      .projection(@projection)

    graticule = geoGraticule10()

    grat = bkg.selectAppend('path.graticule')
      .datum(graticule)
      .call @redrawPaths

    land = bkg.selectAppend('path.land')
      .datum(land50)
      .call @redrawPaths

    updateData = (val)=> =>
      land.datum(val)
        .call @redrawPaths

    sens = 0.08
    dragging = drag()
      .subject (d)=>
        r = @projection.rotate()
        return {
          x: r[0]/sens
          y: -r[1]/sens
        }
      .on "drag", =>
        rotate = @projection.rotate()
        @projection.rotate [event.x * sens, -event.y * sens, rotate[2]]
        @redrawPaths()
      .on 'start', updateData(land110)
      .on 'end', updateData(land50)

    zoomed = =>
      {deltaY} = event.sourceEvent
      currScale = @projection.scale()
      newScale = currScale - 2*deltaY
      if newScale < minScale
        return
      if newScale > minScale * 10
        return
      return if newScale == currScale
      @projection.scale newScale
      @redrawPaths()

    zoomBehavior = zoom()
      .on 'zoom', zoomed
      .on "start", updateData(land110)
      .on "end", updateData(land50)

    @map.call dragging
    @map.call zoomBehavior

ColumnIndexMap = =>
  h ColumnDataConsumer, null, ({columns})->
    h ColumnIndexMap__, {columns}

export default ColumnIndexMap
