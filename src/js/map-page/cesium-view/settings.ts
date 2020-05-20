import h from '@macrostrat/hyper'
import {FormGroup, NumericInput} from '@blueprintjs/core'
import {useDispatch, useSelector} from 'react-redux'

const GlobeSettings = (props)=>{
  const dispatch = useDispatch()
  const value = useSelector(s => s.globe.verticalExaggeration)

  return h("div.globe-settings", [
    h(FormGroup, {label: "Vertical exaggeration"},
      h(NumericInput, {
        value,
        onValueChange(value) { dispatch({type: 'set-exaggeration', value}) }
      })
    )
  ])
}

export {GlobeSettings}
