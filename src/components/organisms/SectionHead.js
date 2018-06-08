import styled from 'styled-components'

const SectionHead = styled.h2`
  font-size: ${props => (props.small ? 2 : 2.8)}rem;
  font-weight: 900;
  text-transform: ${props => (props.uppercase ? 'uppercase' : 'none')};
  padding: 0 2rem;
`

export default SectionHead
