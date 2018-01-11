import { connect } from 'react-redux'
import { pageClick } from '../actions'
import ExampleComponent from '../components/ExampleComponent'

const mapStateToProps = (state) => {
  return {
    msg: state.update.msg,
    clicks: state.update.clicks
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
