import styled from 'styled-components'

const Section = styled.section`
  padding: 2rem 0;
  margin: 0 auto;
  text-align: ${props => (props.center ? 'center' : 'left')};
  background-color: ${props =>
    props.image ? `none` : props.primary ? props.theme.main : 'none'};
  background-image: ${props =>
    props.image
      ? `url(${
          props.image
        }), linear-gradient(rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0.5))`
      : 'none'};
  background-blend-mode: overlay;
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  color: ${props => (props.primary ? 'white' : '#495057')};
  a {
    color: ${props => (props.primary ? 'white' : '#495057')};
  }
`

export default Section
