import React, { Component } from 'react'
import PropTypes from 'prop-types'
import AnimateHeight from 'react-animate-height'
import Drawer from 'material-ui/Drawer'
import List, { ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction } from 'material-ui/List'
import Divider from 'material-ui/Divider'
import Grid from 'material-ui/Grid';

import CloseIcon from 'material-ui-icons/Close'
import Button from 'material-ui/Button'
import IconButton from 'material-ui/IconButton'
import InfoOutlineIcon from 'material-ui-icons/InfoOutline'
import LocationOnIcon from 'material-ui-icons/LocationOn'
import ExpandMoreIcon from 'material-ui-icons/ExpandMore'
import ExpandLessIcon from 'material-ui-icons/ExpandLess'
import Typography from 'material-ui/Typography'

import ElevationIcon from './ElevationIcon'
import AgeChip from './AgeChip'
import LithChip from './LithChip'
import Reference from './Reference'
import MapSource from './MapSource'

class InfoDrawer extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { infoDrawerOpen, toggleInfoDrawer, expandInfoDrawer, infoDrawerExpanded } = this.props
    let { mapInfo } = this.props
    
    let exitTransition = {
      exit: 1000
    }

    if (!mapInfo || !mapInfo.mapData) {
      mapInfo = {
        mapData: []
      }
    }

    let height = (this.props.infoDrawerExpanded) ? 'auto' : '0'
    let bestSource = (mapInfo && mapInfo.mapData && mapInfo.mapData.length)
    ? mapInfo.mapData[0]
    : {
      name: null,
      descrip: null,
      comments: null,
      liths: [],
      b_int: {},
      t_int: {},
      ref: {}
    }

    return (
      <Drawer
        anchor="bottom"
        open={infoDrawerOpen}
        onBackdropClick={toggleInfoDrawer}
        transitionDuration={300}
        classes={{
          "paper": "infoDrawer"
        }}
      >
      <Grid container alignItems="center" alignContent="center" justify="center">
        <Grid item xs={12}>
          <div className="infodrawer-content">
            <Grid container alignItems="center" alignContent="center">
              <Grid item xs={12}>
                <div className={infoDrawerExpanded ? 'hidden' : ''}>
                  <h1 className="infoDrawer-title">
                    {
                      mapInfo && mapInfo.mapData && mapInfo.mapData.length
                      ? ( mapInfo.mapData[0].name && mapInfo.mapData[0].name.length ? mapInfo.mapData[0].name : mapInfo.mapData[0].descrip )
                      : 'No data found'}
                  </h1>
                  {
                    mapInfo && mapInfo.mapData && mapInfo.mapData.length
                    ? <AgeChip b_int={mapInfo.mapData[0].b_int} t_int={mapInfo.mapData[0].t_int}></AgeChip>
                    : ''
                  }
                  {
                    mapInfo && mapInfo.mapData && mapInfo.mapData.length
                    ? mapInfo.mapData[0].liths.map( (lith, i) => {
                      return <LithChip key={i} lith={lith}/>
                    })
                    : ''
                  }
                </div>

                <span className={infoDrawerExpanded ? 'hidden' : ''}>
                  <Button color="default" aria-label="InfoDrawer" onClick={expandInfoDrawer}>
                    More <ExpandMoreIcon />
                  </Button>
                </span>
                <span className={infoDrawerExpanded ? '' : 'hidden'}>
                  <Button color="default" aria-label="InfoDrawer" onClick={expandInfoDrawer}>
                    Less <ExpandLessIcon />
                  </Button>
                </span>
              </Grid>
            </Grid>
            <div className="infoDrawer-close">
              <IconButton color="default" aria-label="InfoDrawer" onClick={toggleInfoDrawer}>
                <CloseIcon/>
              </IconButton>
            </div>



            <AnimateHeight
              duration={ 500 }
              height={ height }
            >
              <div>
                {mapInfo.mapData.map((source, i) => {
                  return <MapSource key={i} source={source}/>
                })}
              </div>
            </AnimateHeight>
          </div>
        </Grid>
      </Grid>

    </Drawer>
    )
  }
}

export default InfoDrawer
