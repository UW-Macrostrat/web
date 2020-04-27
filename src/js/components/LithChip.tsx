import React, { Component } from 'react'
import { hexToRgb } from '../utils'
class LithChip extends Component {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <div className="lith-chip" style={{ backgroundColor: hexToRgb(this.props.lith.color) }}>
        { this.props.lith.lith }
      </div>
    )

  }
}

export default LithChip
