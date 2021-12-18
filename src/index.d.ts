declare module "*.styl" {
  const styles: { [className: string]: string };
  export default styles;
}

declare module "*.mdx" {
  export default function MDXComponent(props: any): JSX.Element;
}
