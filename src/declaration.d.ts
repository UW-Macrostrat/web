// declaration.d.ts

import type { Hyper } from "@macrostrat/hyper";

// Union of hyper and record
type StyledHyper = Hyper & Record<string, string>;

// Style modules
declare module "*.module.styl" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.styl" {
  const content: string;
  export default content;
}

declare module "*.sass" {
  const content: string;
  export default content;
}

// Override declarations for sass module
declare module "*.module.sass" {
  const classes: { [key: string]: string };
  export default classes;
}
