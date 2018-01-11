import React, { Component } from 'react'
import PropTypes from 'prop-types'

class ExampleComponent extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { msg, clicks, onClick } = this.props

    return (
      <div onClick={onClick}>
        <h1>I'm a component</h1>
        <p>{ msg } { clicks }</p>
      </div>
    )
  }
}

ExampleComponent.propTypes = {
  onClick: PropTypes.func.isRequired,
  msg: PropTypes.string.isRequired,
  clicks: PropTypes.number.isRequired
}

export default ExampleComponent
