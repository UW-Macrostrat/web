import React, { Component } from 'react'
import Button from 'material-ui/Button'
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from 'material-ui/Dialog'

class About extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
        <Dialog
          fullScreen={window.innerWidth > 500 ? false : true}
          open={this.props.aboutOpen || false}
          aria-labelledby="responsive-dialog-title"
        >
          <DialogTitle id="responsive-dialog-title">{"About"}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              <span className="about-section">
                Basemap <a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a>
              </span>

              <span className="about-section">
                Satellite map <a href="https://www.mapbox.com/about/maps/" target="_blank">© Mapbox</a> <a href="http://www.openstreetmap.org/about/" target="_blank">© OpenStreetMap</a> <a href="https://www.digitalglobe.com/" target="_blank">© DigitalGlobe</a>
              </span>

              <span className="about-section">
                Elevation data from SRTM1 and ETOPO1
              </span>

              <span className="about-section">
                Place search results © 2017 Mapbox and its suppliers. All rights reserved.
              </span>

              <span className="about-section">
                Geologic map data adapted from <a href="https://macrostrat.org/api/v2/defs/sources?all" target="_blank">various providers</a> as noted.
              </span>

              <span className="about-section">
                Development team comprised of <a href="http://johnjcz.com" target="_blank">John J Czaplewski</a>, lead developer. <a href="http://strata.geology.wisc.edu" target="_blank">Shanan Peters</a>, P.I. and scientific lead. Puneet Kishor, initial earth-base and literature search development.
              </span>

              <span className="about-section">
                Funding for core Macrostrat development via NSF EAR-1150082, Macrostrat—geologic map integration via NSF ICER-1440312, and literature integration via NSF ICER-1343760.
              </span>

            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.props.toggleAbout} color="primary" autoFocus>
              Close
            </Button>
          </DialogActions>
        </Dialog>
    )
  }
}
//export default withMobileDialog()(About)
export default About
