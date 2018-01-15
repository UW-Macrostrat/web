import React, { Component } from 'react'

/*
  Takes: b_int and t_int
*/
class AgeChip extends Component {
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
    let tIntChip = (
      <div className="age-chip age-chip-t-int" style={{ backgroundColor: this.hexToRgb(this.props.t_int.color) }}>
        {this.props.t_int.int_name}
        <div className="age-chip-age">
          {this.props.t_int.t_age}<span className='age-chip-ma'>Ma</span>
        </div>
      </div>
    )

    return (
      <div className="age-chip-container">
        <div className="age-chip" style={{ backgroundColor: this.hexToRgb(this.props.b_int.color) }}>
          {this.props.b_int.int_name || 'Unknown'}
          {this.props.b_int.b_age
            ? <div className="age-chip-age">
              {this.props.b_int.b_age}<span className='age-chip-ma'>Ma</span> {
                this.props.b_int.int_id === this.props.t_int.int_id
                ? ` - ${this.props.b_int.t_age}`
                : ''
              }
              {
                this.props.b_int.int_id === this.props.t_int.int_id
                ? <span className='age-chip-ma'>Ma</span>
                : ''
              }
            </div>
            : ''
          }

        </div>
        {
          this.props.b_int.int_id != this.props.t_int.int_id
          ? tIntChip
          : ''
        }
      </div>
    )

  }
}

export default AgeChip
