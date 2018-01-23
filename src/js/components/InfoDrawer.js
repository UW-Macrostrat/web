import React, { Component } from 'react'
import PropTypes from 'prop-types'
import AnimateHeight from 'react-animate-height'
import Drawer from 'material-ui/Drawer'
import List, { ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction } from 'material-ui/List'
import Divider from 'material-ui/Divider'
import Collapse from 'material-ui/transitions/Collapse'
import Grid from 'material-ui/Grid'
import ExpansionPanel, {
  ExpansionPanelDetails,
  ExpansionPanelSummary,
} from 'material-ui/ExpansionPanel'

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
import MacrostratAgeChip from './MacrostratAgeChip'
import LithChip from './LithChip'
import AttrChip from './AttrChip'
import Reference from './Reference'
import MapSource from './MapSource'
import LongText from './LongText'

class InfoDrawer extends Component {
  constructor(props) {
    super(props)
    this.state = {
      expanded: null,
    }
    this.handleChange = panel => (event, expanded) => {
      this.setState({
        expanded: expanded ? panel : false,
      });
    }
  }

  normalizeLng(lng) {
    // via https://github.com/Leaflet/Leaflet/blob/32c9156cb1d1c9bd53130639ec4d8575fbeef5a6/src/core/Util.js#L87
    return (((lng - 180) % 360 + 360) % 360 - 180).toFixed(4);
  }

  render() {
    const { infoDrawerOpen, toggleInfoDrawer, expandInfoDrawer, infoDrawerExpanded } = this.props
    let { mapInfo } = this.props
    const { expanded } = this.state

    let expansionPanelClasses = {
      'content': 'expansion-panel',
      'root': 'expansion-panel-root'
    }
    let expansionPanelDetailClasses = {
      'root': 'expansion-panel-detail'
    }

    let exitTransition = {
      exit: 1000
    }

    if (!mapInfo || !mapInfo.mapData) {
      mapInfo = {
        mapData: []
      }
    }

    let height = (this.props.infoDrawerExpanded) ? 'auto' : '0'
    let source = (mapInfo && mapInfo.mapData && mapInfo.mapData.length)
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
      <div className="d">
      <Grid container alignItems="center" alignContent="center" justify="center" classes={{ 'spacing-xs-16': 'infodrawer-grid' }}>
        <Grid item xs={12} classes={{ 'grid-xs-12': 'infodrawer-header-grid'}}>
          <div className="infodrawer-header">
            <div className="infodrawer-header-item lnglat-container">
              <span className="lnglat">
                {this.normalizeLng(this.props.infoMarkerLng)}  {this.props.infoMarkerLat}
              </span>
              <span className="z">
                {mapInfo.elevation}<span className='age-chip-ma'>m</span> | {(mapInfo.elevation * 3.28084).toFixed(0)}<span className='age-chip-ma'>ft</span>
              </span>
            </div>
            <div className="infodrawer-header-item">
              <IconButton color="default" aria-label="InfoDrawer" onClick={toggleInfoDrawer}>
                <CloseIcon/>
              </IconButton>
            </div>
          </div>

        </Grid>
        <Grid item xs={12}>
          <div className="infodrawer-content">
            <Grid container alignItems="center" alignContent="center">
              <Grid item xs={12}>
                <div>
                  <Grid container alignItems="center">
                    <Grid item xs={10}>
                      <h1 className="infoDrawer-title">
                        {
                          mapInfo && mapInfo.mapData && mapInfo.mapData.length
                          ? ( mapInfo.mapData[0].name && mapInfo.mapData[0].name.length ? mapInfo.mapData[0].name : mapInfo.mapData[0].descrip )
                          : 'No data found'}
                      </h1>
                    </Grid>
                    <Grid item xs={2}>
                      <span className={infoDrawerExpanded || (!mapInfo || !mapInfo.mapData || !mapInfo.mapData.length) ? 'hidden' : ''}>
                        <Button color="default" aria-label="InfoDrawer" onClick={expandInfoDrawer}>
                           <ExpandMoreIcon />
                        </Button>
                      </span>
                      <span className={infoDrawerExpanded ? '' : 'hidden'}>
                        <Button color="default" aria-label="InfoDrawer" onClick={expandInfoDrawer}>
                           <ExpandLessIcon />
                        </Button>
                      </span>
                    </Grid>


                  </Grid>
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


              </Grid>
            </Grid>

            <AnimateHeight
              duration={ 500 }
              height={ height }
            >
              <div>
                <div className="map-source-attrs">
                  {
                    source.name && source.name.length
                    ? <div className="map-source-attr">
                        <span className="attr">Name: </span> {source.name}
                      </div>
                    : ''
                  }
                  {
                    source.age && source.age.length
                    ? <div className="map-source-attr">
                        <span className="attr">Age: </span> {source.age}
                      </div>
                    : ''
                  }
                  {
                    source.strat_name && source.strat_name.length
                    ? <LongText name="Stratigraphic name(s)" text={source.strat_name}/>
                    :''
                  }
                  {
                    source.lith && source.lith.length
                    ? <LongText name="Lithology" text={source.lith}/>
                    : ''
                  }
                  {
                    source.descrip && source.descrip.length
                    ? <LongText name="Description" text={source.descrip}/>
                    : ''
                  }
                  {
                    source.comments && source.comments.length
                    ? <LongText name="Comments" text={source.comments}/>
                    : ''
                  }
                  {
                    source.lines && source.lines.length
                    ?
                      <div className="map-source-attr">
                        <span className="attr">Lines: </span>
                        {source.lines.map((line, idx) => {
                          return <div className="map-source-line" key={idx}>
                            {
                              line.name
                              ? <span className="line-attr"><span className="attr">Name: </span> {line.name}</span>
                              : ''
                            }
                            {
                              line.type
                              ? <span className="line-attr"><span className="attr">Type: </span> {line.type}</span>
                              : ''
                            }
                            {
                              line.direction
                              ? <span className="line-attr"><span className="attr">Direction: </span> {line.direction}</span>
                              : ''
                            }
                            {
                              line.descrip
                              ? <span className="line-attr"><span className="attr">Description: </span> {line.descrip}</span>
                              : ''
                            }
                          </div>
                        })}
                      </div>

                    : ''
                  }
                  <Reference reference={source.ref} />
                </div>


                {
                  source.macrostrat && Object.keys(source.macrostrat).length > 0 ?
                  <span>
                    <Divider/>
                    <h1 className="infoDrawer-title">Macrostrat Inferred</h1>
                  </span>

                  : ''
                }

                {
                  source.macrostrat && source.macrostrat.b_age  ?
                  <ExpansionPanel>
                    <ExpansionPanelSummary classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Age: </Typography>
                      <MacrostratAgeChip
                        b_int={source.macrostrat.b_int}
                        t_int={source.macrostrat.t_int}
                        b_age={source.macrostrat.b_age}
                        t_age={source.macrostrat.t_age}
                        color={source.color}
                      />
                    </ExpansionPanelSummary>
                  </ExpansionPanel>
                  : ''
                }

                {
                  source.macrostrat && source.macrostrat.strat_names ?
                  <ExpansionPanel>
                    <ExpansionPanelSummary classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Names: </Typography>
                      {source.macrostrat.strat_names[0].rank_name}...
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      <Divider/>
                      {source.macrostrat.strat_names.map((name, i) => {
                        return <span key={i}>{ name.rank_name }</span>
                      })}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                  : ''
                }

                {
                  source.macrostrat && source.macrostrat.max_thick ?
                  <ExpansionPanel>
                    <ExpansionPanelSummary classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Thickness: </Typography>
                      <Typography className="expansion-summary-detail">{ source.macrostrat.min_min_thick } - { source.macrostrat.max_thick }<span className='age-chip-ma'>m</span></Typography>
                    </ExpansionPanelSummary>
                  </ExpansionPanel>
                  : ''
                }

                {
                  source.macrostrat && source.macrostrat.pbdb_collections ?
                  <ExpansionPanel>
                    <ExpansionPanelSummary classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Fossil collections: </Typography>
                      <Typography className="expansion-summary-detail">{ source.macrostrat.pbdb_collections }</Typography>
                    </ExpansionPanelSummary>
                  </ExpansionPanel>
                  : ''
                }
                {
                  source.macrostrat && source.macrostrat.pbdb_occs ?
                  <ExpansionPanel>
                    <ExpansionPanelSummary classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Fossil occurrences: </Typography>
                      <Typography className="expansion-summary-detail">{ source.macrostrat.pbdb_occs }</Typography>
                    </ExpansionPanelSummary>
                  </ExpansionPanel>
                  : ''
                }

                {
                  source.macrostrat && source.macrostrat.liths && source.macrostrat.liths.length ?
                  <ExpansionPanel expanded={expanded === 'lithology'} onChange={this.handleChange('lithology')}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Lithology: </Typography>
                      {source.macrostrat && source.macrostrat.lith_classes ? source.macrostrat.lith_classes.map( (lithClass, i) => {
                        return <AttrChip key={i} name={lithClass.name} color={lithClass.color} />
                      }) : ''}
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      {source.macrostrat.liths.map( (lith, i) => {
                        return <AttrChip key={i} name={lith.lith} color={lith.color}/>
                      })}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                  : ''
                }

                {
                  source.macrostrat && source.macrostrat.environs && source.macrostrat.environs.length ?
                  <ExpansionPanel expanded={expanded === 'environment'} onChange={this.handleChange('environment')}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Environment: </Typography>
                      {source.macrostrat && source.macrostrat.environ_classes ? source.macrostrat.environ_classes.map( (environClass, i) => {
                        return <AttrChip key={i} name={environClass.name} color={environClass.color} />
                      }) : ''}
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      {source.macrostrat.environs.map( (environ, i) => {
                        return <AttrChip key={i} name={environ.environ} color={environ.color}/>
                      })}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                  : ''
                }

                {
                  source.macrostrat && source.macrostrat.econs && source.macrostrat.econs.length ?
                  <ExpansionPanel expanded={expanded === 'economy'} onChange={this.handleChange('economy')}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Economy: </Typography>
                      {source.macrostrat && source.macrostrat.econ_classes ? source.macrostrat.econ_classes.map( (econClass, i) => {
                        return <AttrChip key={i} name={econClass.name} color={econClass.color} />
                      }) : ''}
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      {source.macrostrat.econs.map( (econ, i) => {
                        return <AttrChip key={i} name={econ.econ} color={econ.color}/>
                      })}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                  : ''
                }

              </div>
            </AnimateHeight>
          </div>
        </Grid>
      </Grid>
      </div>
    </Drawer>
    )
  }
}

export default InfoDrawer
