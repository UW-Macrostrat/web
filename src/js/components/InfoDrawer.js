import React, { Component } from 'react'
import PropTypes from 'prop-types'
import AnimateHeight from 'react-animate-height'
import Drawer from 'material-ui/Drawer'
import List, { ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction } from 'material-ui/List'
import Divider from 'material-ui/Divider'

import CloseIcon from 'material-ui-icons/Close'
import IconButton from 'material-ui/IconButton'
import InfoOutlineIcon from 'material-ui-icons/InfoOutline'
import LocationOnIcon from 'material-ui-icons/LocationOn'
import ExpandMoreIcon from 'material-ui-icons/ExpandMore'
import ExpandLessIcon from 'material-ui-icons/ExpandLess'
import Typography from 'material-ui/Typography'

import ElevationIcon from './ElevationIcon'

class InfoDrawer extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    const { infoDrawerOpen, toggleInfoDrawer, expandInfoDrawer, infoDrawerExpanded } = this.props

    let exitTransition = {
      exit: 1000
    }

    let height = (this.props.infoDrawerExpanded) ? 'auto' : '0'
    return (
      <Drawer
        anchor="bottom"
        open={infoDrawerOpen}
        onBackdropClick={toggleInfoDrawer}
        transitionDuration={exitTransition}
      >
        <div className="infodrawer-content">
          <h1>erhmerhgerrdddddd!!!</h1>
          <IconButton color="default" aria-label="InfoDrawer" onClick={toggleInfoDrawer}>
            <CloseIcon/>
          </IconButton>
          <IconButton color="default" aria-label="InfoDrawer" onClick={expandInfoDrawer}>
            <span className={infoDrawerExpanded ? 'hidden' : ''}>
              <ExpandMoreIcon />
            </span>
            <span className={infoDrawerExpanded ? '' : 'hidden'}>
              <ExpandLessIcon />
            </span>
          </IconButton>
          <AnimateHeight
            duration={ 500 }
            height={ height }
          >
            <div>

              Lorem ipsum dolor amet franzen vinyl gochujang whatever swag pickled tattooed single-origin coffee vegan. Copper mug palo santo air plant, dreamcatcher waistcoat art party knausgaard glossier selfies kale chips leggings. Chia iPhone slow-carb locavore glossier tote bag drinking vinegar hella kombucha snackwave cronut XOXO chartreuse. 3 wolf moon master cleanse asymmetrical, sartorial cred +1 readymade thundercats ethical messenger bag subway tile wayfarers pabst williamsburg. Bicycle rights unicorn shaman cold-pressed vape before they sold out whatever PBR&B street art shoreditch vaporware. Pok pok fashion axe keffiyeh etsy actually hell of, bespoke keytar ramps leggings offal.

              Blue bottle literally sriracha gluten-free la croix trust fund bicycle rights aesthetic mumblecore williamsburg fashion axe. Wayfarers irony cray street art. Gochujang squid tattooed art party intelligentsia iceland yr snackwave swag affogato taxidermy. Live-edge plaid edison bulb, 8-bit fam hoodie aesthetic seitan intelligentsia poke normcore wayfarers cronut readymade etsy. Next level lumbersexual squid, vaporware salvia man braid mlkshk before they sold out whatever fanny pack cornhole kogi.

              8-bit brooklyn humblebrag you probably haven't heard of them blue bottle asymmetrical. Mumblecore whatever brooklyn, shaman woke leggings pug heirloom lyft vaporware raw denim pok pok listicle. Sartorial raclette adaptogen, pok pok kogi humblebrag gentrify bespoke umami cold-pressed butcher. Thundercats intelligentsia kale chips farm-to-table, dreamcatcher fashion axe skateboard hella authentic pok pok. Fam shabby chic quinoa lomo brunch try-hard.

              90's flexitarian try-hard la croix knausgaard yuccie trust fund fanny pack kitsch you probably haven't heard of them tbh. Brunch microdosing YOLO vaporware, cred tilde cray gentrify enamel pin meh +1. Hell of enamel pin brunch art party. Fixie gochujang vexillologist, lyft distillery 90's flexitarian edison bulb bespoke post-ironic biodiesel tumeric master cleanse swag authentic. Readymade la croix pour-over raclette chillwave prism pickled meditation.

              Stumptown chambray ramps celiac, single-origin coffee ugh artisan swag scenester. Asymmetrical twee portland organic waistcoat shabby chic adaptogen banjo swag helvetica sustainable. Hammock bespoke shabby chic, jianbing crucifix DIY fingerstache hashtag gochujang. Whatever chartreuse activated charcoal vinyl glossier ramps. Gluten-free yr gentrify letterpress af. Tumeric readymade neutra, semiotics stumptown knausgaard fam seitan quinoa waistcoat twee shabby chic post-ironic organic squid. Hoodie raw denim brunch cred put a bird on it.

            </div>
          </AnimateHeight>
        </div>
    </Drawer>
    )
  }
}

export default InfoDrawer
