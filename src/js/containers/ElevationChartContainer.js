import { connect } from 'react-redux'
import { toggleElevationChart } from '../actions'
import ElevationChart from '../components/ElevationChart'

const mapStateToProps = (state) => {
  return {
    fetchingElevation: state.update.fetchingElevation,
    elevationData: state.update.elevationData,
    elevationChartOpen: state.update.elevationChartOpen
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    toggleElevationChart: () => {
      dispatch(toggleElevationChart())
    }
  }
}

const ElevationChartContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(ElevationChart)

export default ElevationChartContainer
