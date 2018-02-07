import React, { Component } from 'react'
import PropTypes from 'prop-types'
import Drawer from 'material-ui/Drawer'
import List, { ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction } from 'material-ui/List'
import Divider from 'material-ui/Divider'
import DraftsIcon from 'material-ui-icons/Drafts'
import CloseIcon from 'material-ui-icons/Close'
import IconButton from 'material-ui/IconButton'
import InfoOutlineIcon from 'material-ui-icons/InfoOutline'
import LocationOnIcon from 'material-ui-icons/LocationOn'
import SatelliteIcon from 'material-ui-icons/Satellite'
import Typography from 'material-ui/Typography'

import ColumnIcon from './ColumnIcon'
import IndexMapIcon from './IndexMapIcon'
import ElevationIcon from './ElevationIcon'
import FossilIcon from './FossilIcon'

class Menu extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { menuOpen, toggleMenu, toggleBedrock, mapHasBedrock, toggleSatellite, mapHasSatellite, toggleColumns, mapHasColumns, toggleIndexMap, mapHasIndexMap, toggleAbout } = this.props
    let exitTransition = {
      exit: 300
    }
    return (
      <Drawer
        anchor="left"
        open={menuOpen}
        onBackdropClick={toggleMenu}
        transitionDuration={exitTransition}
      >
        <div className="menu-content">
          <List>
            <ListItem>
              <Typography type="headline">
                Macrostrat
              </Typography>
              <ListItemSecondaryAction>
                <IconButton color="default" aria-label="Menu" onClick={toggleMenu}>
                  <CloseIcon/>
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider light/>
            <div className="menu-options">
              <ListItem button onClick={toggleBedrock} style={{ backgroundColor: (mapHasBedrock ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <DraftsIcon />
                </ListItemIcon>
                <ListItemText primary="Bedrock"/>
              </ListItem>
              <ListItem button onClick={toggleColumns} style={{ backgroundColor: (mapHasColumns ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <ColumnIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Columns"/>
              </ListItem>
              <ListItem button onClick={toggleIndexMap} style={{ backgroundColor: (mapHasIndexMap ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <IndexMapIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Index"/>
              </ListItem>
              <ListItem button onClick={toggleIndexMap} style={{ backgroundColor: (mapHasIndexMap ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <FossilIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Fossils"/>
              </ListItem>
              <ListItem button onClick={toggleSatellite} style={{ backgroundColor: (mapHasSatellite ? '#eee' : 'transparent') }}>
                <ListItemIcon>
                  <SatelliteIcon />
                </ListItemIcon>
                <ListItemText primary="Satellite"/>
              </ListItem>
              <Divider light/>
              <ListItem button>
                <ListItemIcon>
                  <ElevationIcon size={25} />
                </ListItemIcon>
                <ListItemText primary="Elevation"/>
              </ListItem>
              <ListItem button>
                <ListItemIcon>
                  <LocationOnIcon />
                </ListItemIcon>
                <ListItemText primary="My location"/>
              </ListItem>
              <Divider light/>
              <ListItem button onClick={toggleAbout}>
                <ListItemIcon>
                  <InfoOutlineIcon />
                </ListItemIcon>
                <ListItemText primary="About"/>
              </ListItem>
            </div>
          </List>
        </div>
    </Drawer>
    )
  }
}

// Menu.propTypes = {
//   onClick: PropTypes.func.isRequired,
//   msg: PropTypes.string.isRequired,
//   clicks: PropTypes.number.isRequired
// }

export default Menu
