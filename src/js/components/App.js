import React, { Component, PropTypes } from 'react'
import MainContainer from '../containers/MainContainer'

// Import other components

class App extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <div>
        <MainContainer/>
      </div>
    )
  }
}

export default App
