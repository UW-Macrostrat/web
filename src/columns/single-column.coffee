import {Component} from 'react'
import h from 'react-hyperscript'
import {nest} from 'd3-collection'
import {sum} from 'd3-array'
import {Popover} from '@blueprintjs/core'
import {ColumnComponent} from 'stratiform'
import {MacrostratColumnConsumer} from './column-data'

groupUnits = (sectionUnits)->
  ###
  # Split units in gap-bound packages into nested
  # unit groups
  ###
  __ = []
  lastUnit = null
  group = {}
  for unit in sectionUnits
    # We have a group defined
    {Gp, Fm, Mbr, unit_name} = unit
    #if unit.Gp?

    #if lastUnit?
    #  #if unit.Gp == lastUnit.Gp
    __.push unit
  return __

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

    # Add tops and bottoms to units, then group
    # formations and members
    groupUnits units.map (unit)->
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
        {thickness, color, unit_name, Mbr, Fm, Gp} = unit
        color ?= "#eee"
        style = {
          minHeight: thickness
          backgroundColor: color
        }

        h Popover, [
          h 'div.unit', {style}, [
            h 'p', unit_name
            h 'p', "Mbr: #{Mbr}"
            h 'p', "Fm: #{Fm}"
            h 'p', "Gp: #{Gp}"
          ]
          h 'div.unit-details', null, [
            h 'pre', JSON.stringify(unit,null, 2)
          ]
        ]

export {ColumnContainer}
