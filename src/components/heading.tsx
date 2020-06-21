import styled from "styled-components"

const Heading = styled.h1`
  color: ${(props) => props.theme.colorMain};
  font-size: ${(props) => `${props.theme.fontSize}rem`};
  font-weight: ${(props) => props.theme.fontWeightBold};
  letter-spacing: -0.025rem;
  padding: 20px 0;

  :hover {
    transition: color 0.2s ease-out;
    color: ${(props) => props.theme.colorSub};
  }
`
export default Heading
