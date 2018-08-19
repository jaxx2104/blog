import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import Animate from 'components/molecules/Animate'
import React from 'react'
import styled from 'styled-components'

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
} from '@fortawesome/free-brands-svg-icons'

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

const I = styled.i`
  display: block;
  font-size: ${props => props.size || 4.2}rem;
  padding: 0.4rem;
  text-align: center;
`

const Icon = ({ name, size }) => (
  <Animate animation="fadeIn" data-emergence="visible">
    <I size={size}>
      <FontAwesomeIcon icon={['fab', name]} width="20px" />
    </I>
  </Animate>
)

export default Icon
