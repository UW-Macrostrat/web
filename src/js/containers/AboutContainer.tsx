import { connect } from 'react-redux'
import { toggleAbout } from '../actions'
import About from '../components/About'

const mapStateToProps = (state) => {
  return {
    aboutOpen: state.update.aboutOpen,
    open: state.update.aboutOpen
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleAbout: () => {
      dispatch(toggleAbout())
    }
  }
}

const AboutContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(About)

export default AboutContainer
