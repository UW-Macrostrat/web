import {Component} from 'react'
import h from 'react-hyperscript'
import {MacrostratColumnConsumer} from './column-data'

class SelectionPanel extends Component
  render: ->
    {selection, helpers, columnUnitIndex} = @props
    sel = [selection...] # Sets cannot be mapped over
    h 'div.selected-columns', null, sel.map (col)->
      id = helpers.getID(col)
      units = columnUnitIndex[id] or null
      if not units?
        __ = h 'p', "Loading data for column #{id}"
      else
        __ = h 'pre', null, JSON.stringify(units, null, "  ")
      h 'div.column-data', {key: id}, [
        h 'h4', col.properties.col_name
        __
      ]

__ = (props)->
  h MacrostratColumnConsumer, null, ({selection, helpers, columnUnitIndex})->
    h SelectionPanel, {selection, helpers, columnUnitIndex, props...}

export {__ as SelectionPanel}
