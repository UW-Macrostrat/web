import React from 'react';
import Stats from './Stats';
import RandomColumn from './RandomColumn';

class Main extends React.Component {

  render() {
    return (
      <div className='main'>
        <div className='main-search'>
          <div className='main-title'>
            <h3>SIFT</h3>
          </div>

        </div>
        <Stats/>
        <RandomColumn/>
      </div>
    );
  }
}

export default Main;
