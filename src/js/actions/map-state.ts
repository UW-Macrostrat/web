import {
  addFilter,
  gotInitialMapState
} from './main'


function getInitialMapState() {
  return (dispatch, getState) => {
    // Get the default map state
    let { mapXYZ, mapHasBedrock, mapHasLines, mapHasSatellite, mapHasColumns, mapHasFossils } = getState().update
    let defaultState = {
      z: mapXYZ.z,
      x: mapXYZ.x,
      y: mapXYZ.y,
      satellite: mapHasSatellite,
      bedrock: mapHasBedrock,
      lines: mapHasLines,
      columns: mapHasColumns,
      fossils: mapHasFossils
    }
    let filterTypes = ['strat_name_concepts','strat_name_orphans','intervals','lithology_classes','lithology_types','lithologies','environments','environment_types','environment_classes',]
    let hash = window.location.hash
    let mapState = {
      incomingFilters: []
    }
    try {
      hash = hash.split('/').forEach(d => {
        let parts = d.split('=')

        if (filterTypes.indexOf(parts[0]) > -1) {
          mapState.incomingFilters.push({ type: parts[0], id: parts[1] })
        } else {
          mapState[parts[0]] = parts[1] || true
        }

      })

      if (
        mapState.x &&
        mapState.y &&
        mapState.z &&
        (mapState.x >= -180 && mapState.x <= 180) &&
        (mapState.y >= -85 && mapState.y <= 85) &&
        (mapState.z >= 0 && mapState.z <= 16)
      ) {
        // Sweet, it is legit
        mapState = mapState
      } else {
        // Someone was naughty
        mapState = defaultState
      }
    } catch(e) {
      // Who knows. Doesn't matter. Nothing does.
      mapState = defaultState
    }

    dispatch(gotInitialMapState(mapState))

    if (mapState.incomingFilters && mapState.incomingFilters.length) {
      mapState.incomingFilters.forEach(f => {
        // lith classes and types don't have unique IDs in macrostrat so we use the string
        if (f.type === 'lithology_classes' || f.type === 'lithology_types') {
          dispatch(addFilter({
            type: f.type,
            name: f.id
          }))
        } else {
          dispatch(addFilter(f))
        }
      })
    }
  }
}

export {getInitialMapState}
