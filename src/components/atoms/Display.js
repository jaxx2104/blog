import styled from 'styled-components'

const SectionHead = styled.h2`
  font-size: ${props => (props.small ? 2 : 2.8)}rem;
  font-weight: 800;
  line-height: 1.4;
  padding: 0 2rem;
  text-transform: ${props => (props.uppercase ? 'uppercase' : 'none')};
`

export default SectionHead
