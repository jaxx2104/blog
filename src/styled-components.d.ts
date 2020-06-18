import { light } from "./styles/theme"

type LightTheme = typeof light

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends LightTheme {}
}
