import styled from 'styled-components'

const Heading = styled.h1`
  color: ${props => props.theme.main};
  padding: 20px 0;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.025rem;
  font-feature-settings: 'liga' 1;

  :hover {
    color: ${props => props.theme.sub};
    transition: all 0.4s;
  }
`
export default Heading
