import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { library, IconName } from "@fortawesome/fontawesome-svg-core"
import React from "react"
import styled from "styled-components"
import {
  faApple,
  faAws,
  faFacebook,
  faGithub,
  faHtml5,
  faJs,
  faNode,
  faPhp,
  faReact,
  faTwitter,
  faVuejs,
} from "@fortawesome/free-brands-svg-icons"

library.add(
  faAws,
  faApple,
  faPhp,
  faHtml5,
  faJs,
  faReact,
  faVuejs,
  faTwitter,
  faFacebook,
  faGithub,
  faNode
)

interface Props {
  name: string
  size?: number
}

const Icon: React.FC<Props> = ({ name, size }: Props) => (
  <StyledIcon size={size}>
    <FontAwesomeIcon icon={["fab", name as IconName]} width="20px" />
  </StyledIcon>
)

export default Icon

const StyledIcon = styled.i<{ size?: number }>`
  display: block;
  font-size: ${(props) => props.size || 3}rem;
  padding: 0.4rem;
  text-align: center;
`
