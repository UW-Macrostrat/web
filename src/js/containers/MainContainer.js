import { connect } from 'react-redux'
import { pageClick } from '../actions'
import ExampleComponent from '../components/ExampleComponent'

const mapStateToProps = (state) => {
  return {
    msg: state.handleInteraction.msg,
    clicks: state.handleInteraction.clicks
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    onClick: () => {
      dispatch(pageClick())
    }
  }
}

const MainContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ExampleComponent)

export default MainContainer
