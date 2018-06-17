import styled from 'styled-components'

const Heading = styled.h1`
  color: ${props =>
    props.white ? 'white' : props.primary ? props.theme.main : props.theme.sub};
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.4;
  padding: 0;
  text-decoration: none;
  text-transform: ${props => (props.uppercase ? 'uppercase' : 'none')};
  margin-bottom: 1.25rem;
  :hover {
    color: ${props =>
      props.white
        ? 'white'
        : props.primary
          ? props.theme.sub
          : props.theme.main};
    transition: all 0.4s;
  }
`
export default Heading
