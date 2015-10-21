import React from 'react';

class StratColumnUnit extends React.Component {
  render() {
    return (
      <a href={'#/unit/' + this.props.data.unit_id}>
        <div className='unit-box' style={{
          backgroundColor: 'rgba(' + this.props.data.rgba.r + ',' + this.props.data.rgba.g + ',' + this.props.data.rgba.b + ',' + this.props.data.rgba.alpha + ')',
          color: this.props.data.text_color
        }}>{this.props.data.unit_name}</div>
      </a>
    )
  }
}

export default StratColumnUnit;
