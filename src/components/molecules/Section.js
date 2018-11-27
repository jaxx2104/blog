import styled from 'styled-components'

const Section = styled.section`
  padding: ${props => (props.nospan ? 0 : 2)}rem 0;
  position: relative;
  margin: 0 auto;
  text-align: ${props => (props.center ? 'center' : 'left')};
  background: ${props => {
    if (props.dark) return 'linear-gradient(0deg, #000, #333 50%)'
    if (props.primary) return props.theme.main
    return 'inherit'
  }};
  color: ${props => (props.primary || props.dark ? 'white' : '#495057')};

  a {
    color: ${props => (props.primary || props.dark ? 'white' : '#495057')};
  }
`

export default Section
