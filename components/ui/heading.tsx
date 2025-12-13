import styled from "styled-components"

const Heading = styled.h1`
  color: ${(props) => props.theme.colorMain};
  font-size: ${(props) => `${props.theme.fontSizeLarge}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  letter-spacing: -0.025rem;
  line-height: 1.2;
  margin: 0;

  &:hover {
    transition: color 0.2s ease-out;
    color: ${(props) => props.theme.colorSub};
  }
`
export default Heading
