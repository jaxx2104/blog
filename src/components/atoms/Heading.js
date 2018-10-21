import styled from 'styled-components'

const Heading = styled.h1`
  color: ${props => props.theme.main};
  padding: 0;
  font-size: 1.5rem;

  :hover {
    color: ${props => props.theme.sub};
    transition: all 0.4s;
  }
`
export default Heading
