import { overlayStyle } from "./overlay";

export { overlayStyle };
export const mapStyle = {
  version: 8,
  sources: {
    ...coreStyle.sources,
    ...overlayStyle.sources,
  },
  layers: [...coreStyle.layers, ...overlayStyle.layers],
};

export * from "./map-sources"
export * from "./line-symbols"