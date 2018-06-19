import styled from 'styled-components'

const Animate = styled.div`
  &[data-emergence='visible'] {
    opacity: 1;
    animation: ${props => props.animation} 1s;
  }
  &[data-emergence='hidden'] {
    opacity: 0;
  }
`
export default Animate
