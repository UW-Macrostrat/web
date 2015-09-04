import React from 'react';
import Autocomplete from './AutocompleteES6';
import Stats from './Stats';
import RandomColumn from './RandomColumn';

class Main extends React.Component {

  render() {
    return (
      <div className='main'>
        <div className='main-search'>
          <h3>Search the database</h3>
          <div className='main-autocomplete-container'>
            <div className='autocomplete-wrapper'>
              <Autocomplete minLength='2'/>
            </div>
          </div>

        </div>
        <Stats/>
        <RandomColumn/>
      </div>
    );
  }
}

export default Main;
