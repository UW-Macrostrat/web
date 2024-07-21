// declaration.d.ts

import type { Hyper } from "@macrostrat/hyper";
import type { Component, ReactNode, ReactElement } from "react";

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

type Children = ReactNode | ReactNode[];

declare module "@macrostrat/hyper" {
  export interface Hyper {
    // Function with one or two arguments
    (componentOrTag: Component, children?: Children): Children;
    // Function with three arguments, with one being props
    <P = {}>(
      componentOrTag: Component<P>,
      props: P,
      children?: ReactElement
    ): Children;
    // Function with one list of elements -> React fragment
    (children?: ReactNode[]): ReactElement;
  }
}
