import {Component} from 'react'
import h from 'react-hyperscript'
import classNames from 'classnames'
import {MacrostratColumnConsumer} from './column-data'

class HoveredColumnLegend extends Component
  render: ->
    {hoveredColumn} = @props
    empty = not hoveredColumn?
    className = classNames({empty}, 'hovered-column-legend')
    text = "Hover over a column to display details"
    if not empty
      text = hoveredColumn.properties.col_name
    h 'h4', {className}, text
HC = (props)->
  h MacrostratColumnConsumer, null, ({hoveredColumn})->
    h HoveredColumnLegend, {hoveredColumn, props...}

export {HC as HoveredColumnLegend}
