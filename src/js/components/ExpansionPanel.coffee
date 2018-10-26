import React, {Component} from 'react'
import {Collapse, Button, Icon} from '@blueprintjs/core'

class ExpansionPanelSummary extends Component
  # Shim to do things the Material UI way
  render: ->
    {expanded, children, onChange} = @props
    showExpand = if expanded then 'chevron-up' else 'chevron-down'
    <div className="expansion-panel-header" onClick={onChange}>
      <div className="title">{children}</div>
      <Icon icon={showExpand} />
    </div>

class ExpansionPanelDetails extends Component
  render: ->
    <div>{@props.children}</div>

class ExpansionPanel extends Component
  ###
  # A basic expansion panel component built to mimic the API
  # of the corresponding Material UI component
  ###
  constructor: (props)->
    super props
    # If we don't provide an onChange method,
    # the component is set up to be an un-managed one
    # (i.e. keeps track of its own open/closed state)
    @state = {managed: not onChange?}
    @state.expanded = props.expanded or false

  render: ->

    {onChange, title, children, expanded} = @props

    # Basic methods for an unmanaged component
    if not @state.managed
      expanded = @state.expanded
      onChange = => @setState {expanded: not expanded}

    newChildren = []
    for c in children
      if c.type == ExpansionPanelSummary
        title = React.cloneElement(c, {expanded, onChange})
        continue
      newChildren.push c

    # Title must be set on element
    if not title?
      if not React.isValidElement(title)
        title = <h4>{title}</h4>
      title = (
        <ExpansionPanelSummary expanded={expanded}>
          {title}
        </ExpansionPanelSummary>
      )

    return (
      <div className="expansion-panel">
        {title}
        <Collapse isOpen={expanded}>{newChildren}</Collapse>
      </div>
    )

export {ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails}

