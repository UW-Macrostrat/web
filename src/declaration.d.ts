// declaration.d.ts

// Style modules
declare module "*.module.styl" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.styl" {
  const content: string;
  export default content;
}

// Style modules
declare module "*.module.sass" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.sass" {
  const content: string;
  export default content;
}
