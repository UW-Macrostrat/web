import {Component} from 'react'
import h from 'react-hyperscript'
import {NonIdealState} from '@blueprintjs/core'
import {ColumnComponent} from 'stratiform'
import {MacrostratColumnConsumer} from './column-data'
import {ColumnContainer} from './single-column'

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
