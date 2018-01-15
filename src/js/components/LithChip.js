import React, { Component } from 'react'

class LithChip extends Component {
  constructor(props) {
    super(props)
  }

  hexToRgb(hex) {
    if (!hex) { return 'rgba(0,0,0,0.3)'}
    hex = hex.replace('#', '')
    let bigint = parseInt(hex, 16)
    let r = (bigint >> 16) & 255
    let g = (bigint >> 8) & 255
    let b = bigint & 255
    return `rgba(${r},${g},${b},0.8)`
  }

  render() {
    return (
      <div className="lith-chip" style={{ backgroundColor: this.hexToRgb(this.props.lith.color) }}>
        { this.props.lith.lith }
      </div>
    )

  }
}

export default LithChip
