import React, { Component } from 'react'

/*
  Takes: b_int and t_int
*/
class MacrostratAgeChip extends Component {
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
        {this.props.t_int.t_age
          ? <div className="age-chip-age">
              {this.props.t_int.b_age}<span className='age-chip-ma'>Ma</span>
              - {this.props.t_int.t_age}<span className='age-chip-ma'>Ma</span>
            </div>
          : ''
        }
      </div>
    )

    return (
      <div className="age-chip-container">
        <div className="age-chip" style={{ backgroundColor: this.hexToRgb(this.props.color) }}>
          {this.props.b_int.int_name || 'Unknown'} - {this.props.t_int.int_name || 'Unknown'}

          <div className="age-chip-age">
            {this.props.b_age}<span className='age-chip-ma'>Ma</span> - {this.props.t_age}<span className='age-chip-ma'>Ma</span>
          </div>
        </div>
      </div>
    )

  }
}

export default MacrostratAgeChip
