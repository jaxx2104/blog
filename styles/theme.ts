// Define what props.theme will look like
const theme = {
  colorMain: "#e91e63",
  colorSub: "#868e96",
  colorAccent: "#495057",
  colorText: "#495057",
  colorBackground: "#fff",
  contentWidth: 600,
  fontSizeSmall: 0.5,
  fontSize: 0.8,
  fontSizeLarge: 1,
  fontSizeJumbo: 1.5,
  fontWeight: 400,
  fontWeightBold: 900,
}

export const lightTheme = theme

export const darkTheme = {
  ...theme,
  ...{
    colorAccent: "#fff",
    colorText: "#fff",
    colorBackground: "#282c35",
  },
}
