import h from '@macrostrat/hyper'
import ColumnIcon from './icons/ColumnIcon'
import LineIcon from './icons/LineIcon'
import ElevationIcon from './icons/ElevationIcon'
import FossilIcon from './icons/FossilIcon'
import BedrockIcon from './icons/BedrockIcon'
import {Button, ButtonGroup, Alignment, IButtonProps} from '@blueprintjs/core'
import {CloseableCard} from './CloseableCard'
import {useSelector, useDispatch} from 'react-redux'

type ListButtonProps = IButtonProps & {icon: React.ComponentType | Pick<IButtonProps,"icon">}
const ListButton = (props: ListButtonProps)=>{
  let {icon, ...rest} = props
  if (typeof props.icon != 'string') {
    icon = h(props.icon, {size: 25})
  }
  return h(Button, {...rest, icon})
}

const MinimalButton = (props)=>h(Button, {...props, minimal: true})

const LayerButton = (props: ListButtonProps & {layer: string} )=>{
  const {layer, ...rest} = props
  const active = useSelector(state => state.update["mapHas"+layer])
  const dispatch = useDispatch()
  const onClick = ()=>dispatch({type: "TOGGLE_"+layer.toUpperCase()})
  return h(ListButton, {
    active,
    onClick,
    text: layer,
    ...rest
  })
}

const MenuGroup = (props)=> h(ButtonGroup, {
  className: "menu-options",
  vertical: true,
  minimal: true,
  alignText: Alignment.LEFT,
  large: true,
  ...props
})

const Menu = (props)=>{

  const toggleElevationChart = ()=>{
    props.toggleMenu()
    props.toggleElevationChart()
  }

  const {menuOpen, toggleMenu, toggleAbout} = props

  let exitTransition = {exit: 300}

  return h(CloseableCard, {
    isOpen: menuOpen,
    onClose: toggleMenu,
    title: "Layers",
    transitionDuration: exitTransition
  }, [
    h(CloseableCard.Header, [
      h(ButtonGroup, [
        h(MinimalButton, {icon: "layers", text: "Layers"}),
        h(MinimalButton, {icon: "settings", text: "Settings"}),
        h(MinimalButton, {icon: "info-sign", text: "About" , onClick: toggleAbout})
      ])
    ]),
    h("div.menu-content", [
      h(MenuGroup, [
        h(LayerButton, {
          layer: "Bedrock",
          icon: BedrockIcon
        }),
        h(LayerButton, {
          layer: "Lines",
          icon: LineIcon
        }),
        h(LayerButton, {
          layer: "Columns",
          icon: ColumnIcon
        }),
        h(LayerButton, {
          layer: "Fossils",
          icon: FossilIcon
        }),
        h(LayerButton, {
          layer: "Satellite",
          icon: 'satellite'
        }),
      ]),
      h(MenuGroup, [
        h(ListButton, {disabled: true, icon: 'map-marker'}, "Your location"),
        h(ListButton, {onClick: toggleElevationChart, icon: ElevationIcon}, "Elevation profile")
      ])
    ])
  ])
}

export default Menu
