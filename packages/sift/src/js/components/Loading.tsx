import React from 'react';

class Loading extends React.Component {
  render() {
    return (
      <div className={this.props.loading ? 'loading-container' : 'hidden'}>
          <div className='loading-box'>
            <div className='loading-wrapper'>
              <div className='loading'></div>
            </div>

          </div>

      </div>
    )
  }
}

export default Loading;
