// declaration.d.ts

import type { Component, ReactNode, ReactElement } from "react";

type Children = ReactNode | ReactNode[];

declare module "@macrostrat/hyper" {
  interface Hyper {
    // Function with one or two arguments
    (componentOrTag: Component, children?: Children): ReactNode;

    // Function with three arguments, with one being props
    <P = {}>(
      componentOrTag: Component<P>,
      props: P,
      children?: Children
    ): ReactNode;

    // Function with one list of elements -> React fragment
    (children?: ReactNode[]): ReactNode[];
  }
}

import { Hyper } from "@macrostrat/hyper";

// Favicon etc.
declare module "*.png" {
  const value: string;
  export default value;
}

// Get the hyper function from our custom module

type Classes = { readonly [key: string]: string };

type StyledHyper = Classes & Hyper;

declare module "*.styl" {
  const content: string;
  export default content;
}

// Style modules
declare module "*.module.styl" {
  const classes: StyledHyper;
}

// Augment existing declarations for sass module
declare module "*.module.sass" {
  const classes: StyledHyper;
}

// Augment existing declarations for sass module
declare module "*.module.scss" {
  const classes: StyledHyper;
}
