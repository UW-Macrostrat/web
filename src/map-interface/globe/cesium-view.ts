import h from "@macrostrat/hyper";

import "@znemz/cesium-navigation/dist/index.css";

function MacrostratCesiumView(props) {
  return h("div.map-view", "Hello world");
}

// const initialPosition = getInitialPosition(getHashString());

// export function GlobeDevPage() {
//   return h(
//     CesiumView,
//     {
//       terrainProvider,
//       showInspector: true,
//       flyTo: null,
//       initialPosition,
//       displayQuality: DisplayQuality.High,
//       onViewChange(cpos) {
//         setHashString(buildPositionHash(cpos.camera));
//       },
//     },
//     [h(SatelliteLayer)]
//   );
// }

export default MacrostratCesiumView;
