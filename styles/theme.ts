// Define what props.theme will look like
const baseTheme = {
  colorMain: "#e91e63",
  colorSub: "#868e96",
  colorAccent: "#495057",
  colorText: "#495057",
  colorBackground: "#fff",
  colorBorder: "#eee",
  colorShadow: "rgba(0, 0, 0, 0.1)",
  contentWidth: 600,
  fontSizeSmall: 0.6,
  fontSize: 0.8,
  fontSizeLarge: 1,
  fontSizeJumbo: 1.5,
  fontWeight: 400,
  fontWeightBold: 900,
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
