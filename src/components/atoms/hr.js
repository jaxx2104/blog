import styled from "styled-components"

const Hr = styled.hr`
  max-width: 50px;
  margin: 2rem auto;
  border: 0;
  border-top: 3px solid ${(props) => props.theme.main};
`

export default Hr
