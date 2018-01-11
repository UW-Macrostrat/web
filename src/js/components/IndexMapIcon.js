import React, { Component } from 'react'

class IndexMapIcon extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    let style = {
      fill: '#aaaaaa',
      stroke: '#f9f9fa',
      strokeWidth: '25px'
    }
    // let scale = `scale(${this.props.size / 500})`
    let scale = 'scale(1)'
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 732.96 710.46"  height={this.props.size || 50} width={this.props.size || 50} className="custom-svg-icon">
        <defs>
          <clipPath id="clip-path" transform="translate(83.39 105.89)"><rect className="cls-1" width="500" height="500"/></clipPath>
        </defs>
        <g transform={scale}>
          <rect className="cls-2" x="83.39" y="105.89" width="500" height="500" style={style}/>
          <g className="cls-3">
            <rect className="cls-1" x="36.5" y="0.5" width="354.03" height="377.74" style={style}/>
            <rect className="cls-1" x="351.48" y="466.98" width="380.98" height="242.99" style={style}/>
            <rect className="cls-1" x="0.5" y="378.48" width="232.49" height="293.99" style={style}/>
            <rect className="cls-1" x="257.42" y="77.98" width="266.23" height="329.14" style={style}/>
            <rect className="cls-1" x="191.86" y="204.47" width="98.68" height="115.23" style={style}/>
          </g>
        </g>
      </svg>
    )

  }
}

export default IndexMapIcon
