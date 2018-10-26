import React, { Component } from 'react'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction'
import Divider from '@material-ui/core/Divider'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined'
import LocationOnIcon from '@material-ui/icons/LocationOn'
import SatelliteIcon from '@material-ui/icons/Satellite'
import Typography from '@material-ui/core/Typography'
import ColumnIcon from './icons/ColumnIcon'
import LineIcon from './icons/LineIcon'
import ElevationIcon from './icons/ElevationIcon'
import FossilIcon from './icons/FossilIcon'
import BedrockIcon from './icons/BedrockIcon'
import {CloseableCard} from './CloseableCard'

class Menu extends Component {
  constructor(props) {
    super(props)
    this.toggleElevationChart = () => {
      this.props.toggleMenu()
      this.props.toggleElevationChart()
    }
  }

  render() {
    const { menuOpen, toggleMenu, toggleBedrock, mapHasBedrock, toggleLines, mapHasLines, toggleSatellite, mapHasSatellite, toggleColumns, mapHasColumns, toggleAbout, toggleElevationChart, toggleFossils, mapHasFossils } = this.props
    let exitTransition = {
      exit: 300
    }
    const satelliteButtonClasses = {
      'root': 'satellite-icon'
    }
    return (
      <CloseableCard
        isOpen={menuOpen}
        onClose={toggleMenu}
        title="Layers"
        transitionDuration={exitTransition}
      >
        <div className="menu-content">
          <List>
            <div className="menu-options">
              <ListItem button onClick={toggleBedrock} style={{ backgroundColor: (mapHasBedrock ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <BedrockIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Bedrock"/>
              </ListItem>
              <ListItem button onClick={toggleLines} style={{ backgroundColor: (mapHasLines ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <LineIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Lines"/>
              </ListItem>
              <ListItem button onClick={toggleColumns} style={{ backgroundColor: (mapHasColumns ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <ColumnIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Columns"/>
              </ListItem>
              <ListItem button onClick={toggleFossils} style={{ backgroundColor: (mapHasFossils ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <FossilIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Fossils"/>
              </ListItem>
              <ListItem button onClick={toggleSatellite} style={{ backgroundColor: (mapHasSatellite ? '#eee' : 'transparent') }}>
                <ListItemIcon classes={satelliteButtonClasses}>
                  <SatelliteIcon />
                </ListItemIcon>
                <ListItemText primary="Satellite"/>
              </ListItem>
              <Divider light/>
              <ListItem button onClick={this.toggleElevationChart}>
                <ListItemIcon>
                  <ElevationIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Elevation Profile"/>
              </ListItem>
              <ListItem button disabled>
                <ListItemIcon>
                  <LocationOnIcon />
                </ListItemIcon>
                <ListItemText primary="My location"/>
              </ListItem>
              <Divider light/>
              <ListItem button onClick={toggleAbout}>
                <ListItemIcon>
                  <InfoOutlinedIcon />
                </ListItemIcon>
                <ListItemText primary="About"/>
              </ListItem>
            </div>
          </List>
        </div>
    </CloseableCard>
    )
  }
}

export default Menu
