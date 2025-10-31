declare module "*.mdx" {
  import type { ComponentProps, ComponentType, ReactElement } from "react";

  const MDXComponent: ComponentType<ComponentProps<"div">> &
    (() => ReactElement | null);

  export default MDXComponent;
}
