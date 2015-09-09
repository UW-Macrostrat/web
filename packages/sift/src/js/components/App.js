import React from 'react';
import Router from 'react-router';
import Main from './Main';
import Autocomplete from './Autocomplete';


var { Route, DefaultRoute, RouteHandler, Link } = Router;


class App extends React.Component {

  render() {
    return (
      <div className='container'>
        <div id='header'>
          <div className='headerItem left'>
            <a href='/'><img src='dist/img/logo_red.png' className='header-logo'/></a>
            <a href="/sift">
              <h3 className='header-title'><i>sift</i></h3>
            </a>
          </div>
          <div className='headerItem right'>
            <div className='autocomplete-wrapper'>
              <Autocomplete minLength='2'/>
            </div>
          </div>
        </div>

        <div className='page-content'>
          <RouteHandler/>
        </div>
      </div>
    );
  }
}

export default App;
