// Define what props.theme will look like
const theme = {
  colorMain: "#e91e63",
  colorSub: "#868e96",
  colorAccent: "#495057",
  colorText: "#495057",
  colorBackground: "#fff",
  contentWidth: 780,
  fontSizeSmall: 0.75,
  fontSize: 1.4,
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
