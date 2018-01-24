import React, { Component } from 'react'

class AttrChip extends Component {
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
    return `rgba(${r},${g},${b},0.6)`
  }

  render() {
    let styles = {}
    if (this.props.fill) {
      styles['backgroundImage'] = `url('dist/img/geologic-patterns/${this.props.fill}.png')`
    }
    return (
      <div className="lith-chip" style={styles}>
        <div className="lith-chip-inner" style={{backgroundColor: this.hexToRgb(this.props.color) }}>
          { this.props.name }
        </div>
      </div>
    )

  }
}

export default AttrChip
