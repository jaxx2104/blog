import { lightTheme } from "./styles/theme"

type LightTheme = typeof lightTheme

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends LightTheme {}
}
