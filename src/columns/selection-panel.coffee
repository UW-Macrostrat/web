import {Component} from 'react'
import h from 'react-hyperscript'
import {nest} from 'd3-collection'
import {sum} from 'd3-array'
import {NonIdealState} from '@blueprintjs/core'
import {ColumnComponent} from 'stratiform'
import {MacrostratColumnConsumer} from './column-data'

class ColumnContainer extends Component
  @defaultProps: {
    minUnitHeight: 20
    maxUnitHeight: 100
  }
  sectionSurfaces: (section)=>
    ###
    # Computes surface heights for a gap-bound package
    ###
    {maxUnitHeight, minUnitHeight} = @props
    units = section.units.map (unit)->
      {min_thick, max_thick} = unit
      thickness = max_thick
      if thickness < minUnitHeight
        thickness = minUnitHeight
      if thickness > maxUnitHeight
        thickness = maxUnitHeight
      {unit..., thickness}

    totalThickness = sum units, (d)->d.thickness

    bottom = totalThickness
    units.map (unit)->
      top = bottom
      bottom = top-unit.thickness
      {top, bottom, unit...}

  render: ->
    {units} = @props

    # Separate column into gap-bound sections
    # which should be treated mostly separately
    sections = nest()
      .key (d)->d.section_id
      .entries(units)
      .map (d)->
        # Rename entries semantically
        {key: section_id, values: units} = d
        section_id = parseInt(section_id)
        {section_id, units}

    surfaces = sections.map @sectionSurfaces

    h 'div.column', surfaces.map (section)->
      h 'div.section', section.map (unit)->
        {thickness, color, unit_name} = unit
        color ?= "#eee"
        style = {
          height: thickness
          backgroundColor: color
        }
        onMouseOver = ->
          console.log unit

        h 'div.unit', {style, onMouseOver}, unit_name

class EmptyColumnPanel extends Component
  render: ->
    h NonIdealState, {
      title: "No columns selected"
      icon: 'square'
      className: 'selected-columns-empty'
      description: "Select some columns on the map to get started"
    }

class SelectionPanel extends Component
  renderColumn: (col)=>
    {helpers, columnUnitIndex} = @props
    id = helpers.getID(col)
    units = columnUnitIndex[id] or null
    if units?
      __ = [
        h 'h4', col.properties.col_name
        h ColumnContainer, {units}
      ]
    __ ?= h 'p', "Loading data for column #{id}"
    h 'div.column-data', {key: id}, __

  render: ->
    {selection} = @props
    sel = [selection...] # Sets cannot be mapped over
    if sel.length == 0
      return h EmptyColumnPanel

    h 'div.selected-columns', null, sel.map @renderColumn

__ = (props)->
  h MacrostratColumnConsumer, null, ({selection, helpers, columnUnitIndex})->
    h SelectionPanel, {selection, helpers, columnUnitIndex, props...}

export {__ as SelectionPanel}
