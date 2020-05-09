import React, { Component } from 'react'
import h from '@macrostrat/hyper'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import Divider from '@material-ui/core/Divider'
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined'
import LocationOnIcon from '@material-ui/icons/LocationOn'
import SatelliteIcon from '@material-ui/icons/Satellite'
import ColumnIcon from './icons/ColumnIcon'
import LineIcon from './icons/LineIcon'
import ElevationIcon from './icons/ElevationIcon'
import FossilIcon from './icons/FossilIcon'
import BedrockIcon from './icons/BedrockIcon'
import {Button, ButtonGroup, Alignment, IButtonProps} from '@blueprintjs/core'
import {CloseableCard} from './CloseableCard'
import {useSelector, useDispatch} from 'react-redux'

type ListButtonProps = IButtonProps & {icon: React.ComponentType}
const ListButton = (props: ListButtonProps)=>{
  let {icon: iconComponent, ...rest} = props
  return h(Button, {
    ...rest,
    icon: h(iconComponent, {size: 25})
  })
}

const MinimalButton = (props)=>h(Button, {...props, minimal: true})

const LayerButton = (props: ListButtonProps & {layer: string} )=>{
  const {layer, ...rest} = props
  const active = useSelector(state => state["mapHas"+layer])
  const dispatch = useDispatch()
  const onClick = ()=>dispatch({type: "TOGGLE_"+layer.toUpperCase()})
  return h(ListButton, {
    active,
    disabled: active,
    onClick,
    text: layer,
    ...rest
  })
}

const MenuGroup = (props)=> h(ButtonGroup, {
  className: "menu-options",
  vertical: true,
  alignText: Alignment.LEFT,
  large: true,
  ...props
})

const Menu = (props)=>{

  const toggleElevationChart = ()=>{
    props.toggleMenu()
    props.toggleElevationChart()
  }

  const {
    menuOpen, toggleMenu, toggleBedrock,
    mapHasBedrock, toggleLines, mapHasLines,
    toggleSatellite, mapHasSatellite,
    toggleColumns, mapHasColumns, toggleAbout,
    toggleFossils, mapHasFossils
  } = props

  let exitTransition = {exit: 300}

  const satelliteButtonClasses = {root: 'satellite-icon'}

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
          layer: "Fossils",
          icon: FossilIcon
        }),
        h(LayerButton, {
          layer: "Satellite",
          icon: SatelliteIcon
        }),
      ]),
      h(MenuGroup, [
        h(ListButton, {onClick: toggleElevationChart, icon: ElevationIcon}, "Elevation Profile")
      ])
    ])
  ])
}

export default Menu
