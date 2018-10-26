###
# This closeable card is kind of like a dialog but inhabits the document tree
###
import {Component} from 'react'
import {Card, Button} from '@blueprintjs/core'
import h from 'react-hyperscript'

class CloseableCard extends Component
  # need to implement click outside dismisses
  render: ->
    {isOpen, onClose, title, transitionDuration, children, rest...} = @props
    return null if not isOpen
    rest.className = "closeable-card"
    h Card, rest, [
      h 'div.card-header', [
        h 'h5', title
        h Button, {icon: 'small-cross', minimal: true, 'aria-label': 'Close', onClick: onClose}
      ]
      h 'div.card-content', null, children
    ]

export {CloseableCard}
