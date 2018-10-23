import {Component} from 'react'
import {findDOMNode} from 'react-dom'
import h from 'react-hyperscript'
import {geoOrthographic} from 'd3'
import * as d3 from 'd3'
import 'd3-jetpack'
import {get} from 'axios'
import {feature} from 'topojson'

class ColumnIndexMap extends Component
  constructor: (props)->
    super props
    center = [-60, 40]
    width = window.innerWidth
    height = 300
    @state = { width, height }

    @projection = geoOrthographic()
      .rotate([-center[0],-center[1]])
      .precision(0.2)
      .clipAngle(90)
      .translate([width / 2, height / 2])
      .scale width

  render: ->
    {width, height} = @state
    h 'svg#column-index-map', {
      xmlns: "http://www.w3.org/2000/svg"
      width
      height
    }, [
      h 'g.map-backdrop'
    ]

  setWidth: =>
    @setState {width: window.innerWidth}

  componentDidMount: ->
    window.addEventListener 'resize', @setWidth
    # https://unpkg.com/world-atlas@1/world/110m.json
    el = findDOMNode(@)
    map = d3.select(el)

    bkg = map.select("g.map-backdrop")

    # `await` does promises serially for now
    {data} = await get("https://unpkg.com/world-atlas@1/world/50m.json")
    land = feature(data, data.objects.land)

    path = d3.geoPath()
      .projection(@projection)

    graticule = d3.geoGraticule()
      .step([10,10])

    grat = bkg.selectAppend('path.graticule')
      .datum(graticule())
      .attr('d',path)

    land = bkg.selectAppend('path.land')
      .datum(land)
      .attr('d',path)

    console.log land


export default ColumnIndexMap
