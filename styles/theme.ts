// Define what props.theme will look like
const baseTheme = {
  colorMain: "#e91e63",
  colorSub: "#868e96",
  colorAccent: "#495057",
  colorText: "#495057",
  colorBackground: "#fff",
  colorBorder: "#eee",
  colorShadow: "rgba(0, 0, 0, 0.1)",
  contentWidth: 720,
  fontSizeSmall: 0.875,
  fontSize: 1,
  fontSizeLarge: 1.125,
  fontSizeJumbo: 2,
  fontSizeH1: 1.75,
  fontSizeH2: 1.375,
  fontSizeH3: 1.125,
  fontWeight: 400,
  fontWeightBold: 700,
  lineHeight: 1.8,
}

export const lightTheme = {
  ...baseTheme,
  mode: "light" as const,
}

export const darkTheme = {
  ...baseTheme,
  colorAccent: "#fff",
  colorText: "#fff",
  colorBackground: "#282c35",
  colorBorder: "#444",
  colorShadow: "rgba(255, 255, 255, 0.1)",
  mode: "dark" as const,
}
