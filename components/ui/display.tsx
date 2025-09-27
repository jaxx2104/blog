import styled from "styled-components"

const Display = styled.h2<{ $size?: number; $uppercase?: boolean }>`
  font-size: ${(props) => props.$size || props.theme.fontSizeJumbo}rem;
  font-weight: ${(props) => props.theme.fontWeightBold};
  line-height: ${(props) => `${props.theme.fontSizeLarge}rem`};
  letter-spacing: -0.05rem;
  color: ${(props) => props.theme.colorMain};
  padding: 0;
  text-transform: ${(props) => (props.$uppercase ? "uppercase" : "none")};
`

export default Display
