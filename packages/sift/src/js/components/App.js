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
    this.finishAutocomplete = this.finishAutocomplete.bind(this);
  }

  toggleAutocomplete() {
  //  this.setState({
//      autocompleteIsOpen: !this.state.autocompleteIsOpen
  //  });
  }

  finishAutocomplete(item) {
    if (item.id != 0) {
      window.location.hash = '#/' + this.props.categoryRouteLookup[item.dataset] + '/' + item.id;
    } else {
      window.location.hash = '#/' + this.props.categoryRouteLookup[item.dataset] + '/' + item.title;
    }
  }

  render() {
    return (
      <div className='container-fluid'>
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
                onComplete={this.finishAutocomplete}
              />
            </div>
          </div>
        </div>

        <div>
          <RouteHandler/>
        </div>

      </div>
    );
  }
}

App.defaultProps = {
  categoryLookup: {
    'columns': 'Columns',
    'intervals': 'Intervals',
    'strat_name_concepts': 'Stratigraphic Names',
    'strat_name_orphans': 'Other names',
    'lithologies': 'Lithologies',
    'lithology_types': 'Lithology Types',
    'lithology_classes': 'Lithology Classes',
    'environments': 'Environments',
    'environment_types': 'Environment Types',
    'enviornment_classes': 'Environment Classes',
    'econs': 'Economic',
    'econ_types': 'Economic Types',
    'econ_classes': 'Economic Classes',
    'burwell': 'Burwell',
    'groups': 'Groups'
  },
  categoryRoutes: {
    'columns': 'Columns',
    'intervals': 'Intervals',
    'strat_name_concepts': 'Stratigraphic Names',
    'strat_name_orphans': 'Other names',
    'lithologies': 'Lithologies',
    'lithology_types': 'Lithology Types',
    'lithology_classes': 'Lithology Classes',
    'environments': 'Environments',
    'environment_types': 'Environment Types',
    'enviornment_classes': 'Environment Classes',
    'econs': 'Economic',
    'econ_types': 'Economic Types',
    'econ_classes': 'Economic Classes',
    'burwell': 'Burwell',
    'groups': 'Groups'
  },
  categoryRouteLookup: {
    'columns': 'column',
    'intervals': 'interval',
    'strat_name_concepts': 'strat_name_concept',
    'strat_name_orphans': 'strat_name',
    'lithologies': 'lithology',
    'lithology_types': 'lithology_type',
    'lithology_classes': 'lithology_class',
    'environments': 'environment',
    'environment_types': 'environment_type',
    'enviornment_classes': 'environment_class',
    'econs': 'economic',
    'econ_types': 'economic_type',
    'econ_classes': 'economic_class'
  }
}

export default App;
