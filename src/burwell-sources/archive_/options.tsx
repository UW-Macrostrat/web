// const mapStateToProps = state => {
//   return {
//     optionsOpen: state.handleInteraction.optionsOpen,
//     optionsAnchorElement: state.handleInteraction.optionsAnchorElement,
//     selectedScale: state.handleInteraction.selectedScale,
//     view: state.handleInteraction.view
//   }
// }

// const mapDispatchToProps = (dispatch) => {
//   return {
//     openOptions: (event) => {
//       dispatch(openOptions(event))
//     },
//     closeOptions: () => {
//       dispatch(closeOptions())
//     },
//     selectScale: (scale) => {
//       dispatch(selectScale(scale))
//       dispatch(closeOptions())
//     },
//     changeView: (view) => {
//       dispatch(changeView(view))
//       dispatch(closeOptions())
//       dispatch(toggleMenu(false))
//     }
//   }
// }

// const Options = () => {
//     const { optionsOpen, optionsAnchorElement, selectedScale, view } =
//       useBurwellState((state) => state);
//     const runAction = useBurwellActions();

//     const openOptions = (el) => {
//       runAction({
//         type: "open-options",
//         optionsAnchorElement: el,
//         optionsOpen: true,
//       });
//     };

//     const closeOptions = () => {
//       runAction({ type: "close-options", optionsOpen: false });
//     };
//     const selectScale = (scale) => {
//       runAction({ type: "select-scale", selectedScale: scale });
//       closeOptions();
//     };
//     const changeView = (view) => {
//       runAction({ type: "change-view", view });
//       closeOptions();
//       runAction({ type: "toggle-menu", menuOpen: false });
//     };

//     return (
//       <div>
//         <FlatButton
//           id="option-button"
//           onClick={() => {
//             openOptions(document.getElementById("option-button"));
//           }}
//           label="Options"
//         />
//         <Popover
//           open={optionsOpen}
//           anchorEl={optionsAnchorElement}
//           anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
//           targetOrigin={{ horizontal: "right", vertical: "top" }}
//           onRequestClose={() => {
//             closeOptions();
//           }}
//           animation={PopoverAnimationVertical}
//         >
//           <Menu>
//             <MenuItem
//               primaryText="View"
//               leftIcon={<ChevronLeft />}
//               menuItems={[
//                 <MenuItem
//                   primaryText="List"
//                   value="list"
//                   onClick={() => {
//                     changeView("list");
//                   }}
//                   rightIcon={view === "list" ? <NavigationCheck /> : null}
//                 />,
//                 <MenuItem
//                   primaryText="Map"
//                   value="map"
//                   onClick={() => {
//                     changeView("map");
//                   }}
//                   rightIcon={view === "map" ? <NavigationCheck /> : null}
//                 />,
//               ]}
//             />
//             <MenuItem
//               primaryText="Scale"
//               leftIcon={<ChevronLeft />}
//               value={selectedScale}
//               menuItems={[
//                 <MenuItem
//                   onClick={() => {
//                     selectScale("all");
//                   }}
//                   primaryText="All"
//                   value="all"
//                   rightIcon={selectedScale === "all" ? <NavigationCheck /> : null}
//                 />,
//                 <MenuItem
//                   onClick={() => {
//                     selectScale("large");
//                   }}
//                   primaryText="Large"
//                   value="large"
//                   rightIcon={
//                     selectedScale === "large" ? <NavigationCheck /> : null
//                   }
//                 />,
//                 <MenuItem
//                   onClick={() => {
//                     selectScale("medium");
//                   }}
//                   primaryText="Medium"
//                   value="medium"
//                   rightIcon={
//                     selectedScale === "medium" ? <NavigationCheck /> : null
//                   }
//                 />,
//                 <MenuItem
//                   onClick={() => {
//                     selectScale("small");
//                   }}
//                   primaryText="Small"
//                   value="small"
//                   rightIcon={
//                     selectedScale === "small" ? <NavigationCheck /> : null
//                   }
//                 />,
//                 <MenuItem
//                   onClick={() => {
//                     selectScale("tiny");
//                   }}
//                   primaryText="Tiny"
//                   value="tiny"
//                   rightIcon={
//                     selectedScale === "tiny" ? <NavigationCheck /> : null
//                   }
//                 />,
//               ]}
//             />
//           </Menu>
//         </Popover>
//       </div>
//     );
//   };
