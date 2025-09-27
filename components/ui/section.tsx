import styled from "styled-components"

const gradient = "linear-gradient(0deg, rgba(0,0,0,.75), rgba(1,1,1,.25) 50%)"

interface Props {
  primary?: boolean
  dark?: boolean
  center?: boolean
  children?: React.ReactNode
}

const Section = styled.section<Props>`
  padding: 2rem 0 4rem;
  position: relative;
  margin: 0 auto;
  text-align: ${(props) => (props.center ? "center" : "left")};
  color: ${(props) => {
    if (props.primary) return "white"
    if (props.dark) return "white"
    return props.theme.colorAccent
  }};
  background: ${(props) => {
    if (props.dark) return gradient
    if (props.primary) return props.theme.colorMain
    return "inherit"
  }};

  a {
    color: ${(props) => {
      if (props.primary) return "white"
      if (props.dark) return "white"
      return props.theme.colorAccent
    }};
  }
`

export default Section
