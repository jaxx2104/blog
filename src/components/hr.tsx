import styled from "styled-components"

const Hr = styled.hr`
  max-width: 5rem;
  margin: 2rem auto;
  border: 0;
  border-top: 3px solid ${(props) => props.theme.colorSub};
`

export default Hr
