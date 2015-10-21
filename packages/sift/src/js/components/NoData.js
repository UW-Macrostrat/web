import React from 'react';

class NoData extends React.Component {
  render() {
    return (
    <div className={this.props.features.length || this.props.loading ? 'hidden' : 'no-results'}>
      <h1>No data found for this {this.props.type}</h1>
    </div>
    )
  }
}

NoData.defaultProps = {
  features: [],
  type: 'route'
}
export default NoData;
