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
  constructor: (props)->
    super props
    if not onChange?
      managed = false
      @state = {expanded: props.expanded or false}

  render: ->
    {onChange, title, children, expanded} = @props
    if not onChange?
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

