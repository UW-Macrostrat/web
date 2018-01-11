import React, { Component } from 'react'
import PropTypes from 'prop-types'

class Map extends Component {
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    mapboxgl.accessToken = 'pk.eyJ1IjoiamN6YXBsZXdza2kiLCJhIjoiWnQxSC01USJ9.oleZzfREJUKAK1TMeCD0bg';
    let map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v9',
        center: [-89, 43],
        zoom: 7 // starting zoom
    })
  }
  render() {
    // const { msg, clicks, onClick } = this.props

    return (
      <div>
        <div id='map'></div>
      </div>
    )
  }
}

// Map.propTypes = {
//   onClick: PropTypes.func.isRequired,
//   msg: PropTypes.string.isRequired,
//   clicks: PropTypes.number.isRequired
// }

export default Map
