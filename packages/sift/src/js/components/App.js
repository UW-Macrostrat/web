import React from 'react';
import Router from 'react-router';
import Main from './Main';
import Autocomplete from './Autocomplete';

var { Route, DefaultRoute, RouteHandler, Link } = Router;


class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      autocompleteIsOpen: false
    }
    this.toggleAutocomplete = this.toggleAutocomplete.bind(this);
  }

  toggleAutocomplete() {
    this.setState({
      autocompleteIsOpen: !this.state.autocompleteIsOpen
    });
  }

  render() {
    return (
      <div className='container'>
        <div className={this.state.autocompleteIsOpen ? 'autocomplete-mask' : 'hidden'}></div>
        <div id='header'>
          <div className='headerItem left'>
            <a href='/'><img src='dist/img/logo_red.png' className='header-logo'/></a>
            <a href="#">
              <h3 className='header-title'>SIFT</h3>
            </a>
          </div>
          <div className='headerItem right'>
            <div className='autocomplete-wrapper'>
              <Autocomplete
                minLength='2'
                reportState={this.toggleAutocomplete}
              />
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
