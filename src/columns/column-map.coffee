import {Component} from 'react'
import {findDOMNode} from 'react-dom'
import h from 'react-hyperscript'
import {ResizeSensor} from '@blueprintjs/core'
import {geoOrthographic, geoGraticule, geoPath} from 'd3-geo'
import 'd3-jetpack'
import {select, event} from 'd3-selection'
import {drag} from 'd3-drag'
import {zoom} from 'd3-zoom'
import {get} from 'axios'
import {feature} from 'topojson'

class ColumnIndexMap extends Component
  constructor: (props)->
    super props
    width = window.innerWidth
    @state = { width }

  getSize: ->
    {width} = @state
    height = width/6
    if height < 200
      height = 200
    return {width,height}

  render: ->
    {width,height} = @getSize()
    h 'div', [
      h 'svg#column-index-map', {
        xmlns: "http://www.w3.org/2000/svg"
        width
        height
      }, [
        h 'g.map-backdrop'
      ]
    ]

  setWidth: =>
    @setState {width: window.innerWidth}

  getColumns: =>
    {data: {success: {data}}} = await get "https://dev.macrostrat.org/api/v2/columns?format=topojson&all"
    columns = feature(data, data.objects.output)
    console.log columns
    sel = @columnContainer
      .appendMany('path.column', columns.features)
      .attr 'd', @path

  componentWillUpdate: (nextProps, nextState)->

  componentDidMount: ->
    window.addEventListener 'resize', @setWidth
    {width,height} = @getSize()
    center = [-75, 33]

    # This makes sure we never zoom out past the globe's extent,
    # at least using an orthographic projection
    hypot = Math.sqrt(Math.pow(width,2)+Math.pow(height,2))
    minScale = hypot/2

    @projection = geoOrthographic()
      .rotate([-center[0],-center[1]])
      .precision(0.2)
      .clipAngle(90)
      .translate([width / 2, height / 2])
      .scale minScale
      .clipExtent([[0,0],[width,height]])

    # https://unpkg.com/world-atlas@1/world/110m.json
    el = findDOMNode(@)
    map = select(el)

    bkg = map.select("g.map-backdrop")

    # `await` does promises serially for now
    {data} = await get("https://unpkg.com/world-atlas@1/world/50m.json")
    land50 = feature(data, data.objects.land)

    {data} = await get("https://unpkg.com/world-atlas@1/world/110m.json")
    land110 = feature(data, data.objects.land)

    @path = geoPath()
      .projection(@projection)

    graticule = geoGraticule()
      .step([10,10])

    grat = bkg.selectAppend('path.graticule')
      .datum(graticule())
      .attr('d',@path)

    land = bkg.selectAppend('path.land')
      .datum(land50)
      .attr('d',@path)

    redraw = =>
      bkg.selectAll 'path'
        .attr 'd', @path

    updateData = (val)=> =>
      land.datum(val)
        .attr 'd', @path

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
        redraw()
      .on 'start', updateData(land110)
      .on 'end', updateData(land50)


    x = window.innerWidth
    y = window.innerHeight

    minSize = Math.min(x,y)
    ratio = window.devicePixelRatio or 1

    extent = [.24*minSize*ratio, 3*minSize*ratio]

    zoomed = =>
      {deltaY} = event.sourceEvent
      currScale = @projection.scale()
      newScale = currScale - 2*deltaY
      if newScale < minScale
        return
      return if newScale == currScale
      @projection.scale newScale
      redraw()

    zoomBehavior = zoom()
      .scaleExtent extent
      .on 'zoom', zoomed
      .on "start", updateData(land110)
      .on "end", updateData(land50)

    map.call dragging
    map.call zoomBehavior

    @columnContainer = bkg.selectAppend 'g.columns'
    @getColumns()


export default ColumnIndexMap
