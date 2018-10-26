import React, {Component} from 'react'
import {Collapse, Button, Icon} from '@blueprintjs/core'

class ExpansionPanelSummary extends Component
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

  render: ->
    {onChange, title, children, expanded} = @props

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
      <div className="expansion-panel bp3-card">
        {title}
        <Collapse isOpen={expanded}>{newChildren}</Collapse>
      </div>
    )

export {ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails}

