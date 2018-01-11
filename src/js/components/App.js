import React, { Component, PropTypes } from 'react'
import MainContainer from '../containers/MainContainer'
import Map from './Map'
import SearchbarContainer from '../containers/SearchbarContainer'
import MenuContainer from '../containers/MenuContainer'
import InfoDrawerContainer from '../containers/InfoDrawerContainer'
// Import other components

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <MenuContainer/>
        <SearchbarContainer/>
        <InfoDrawerContainer/>
        <MainContainer/>
      </div>
    )
  }
}

export default App
