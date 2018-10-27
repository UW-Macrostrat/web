###
# This closeable card is kind of like a dialog but inhabits the document tree
###
import {Component, Children} from 'react'
import {Card, Button, Navbar, Alignment} from '@blueprintjs/core'
import h from 'react-hyperscript'

class CloseableCardHeader extends Component
  render: ->
    h 'div.card-header-left', @props

class CloseableCard extends Component
  @Header = CloseableCardHeader
  # need to implement click outside dismisses
  render: ->
    {isOpen, onClose, title, transitionDuration, children, rest...} = @props
    return null if not isOpen
    rest.className = "closeable-card"

    # Set header from "CloseableCardHeader" unless  not set,
    # otherwise use "title"
    header = null
    newChildren = Children.map children, (c)->
      if c.type == CloseableCardHeader
        header = c
        return null
      return c

    if not header?
      title = h('h4', title) if title?
      header = h CloseableCardHeader, [title]

    h Card, rest, [
      h 'div.card-header', [
        header
        h Button, {icon: 'small-cross', minimal: true, 'aria-label': 'Close', onClick: onClose}
      ]
      h 'div.card-content', null, newChildren
    ]

export {CloseableCard}
