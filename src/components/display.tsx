import styled from "styled-components"

const Display = styled.h2<{ size?: number; uppercase?: boolean }>`
  font-size: ${(props) => props.size || 2}rem;
  font-weight: ${(props) => props.theme.fontWeightBold};
  line-height: ${(props) => `${props.theme.fontSize}rem`};
  padding: 0 2rem;
  text-transform: ${(props) => (props.uppercase ? "uppercase" : "none")};
`

export default Display
