import styled from "styled-components"

const Flex = styled.div<{ center?: boolean }>`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-flow: wrap;
  justify-content: ${(props) => (props.center ? "center" : "left")};
`

export default Flex
