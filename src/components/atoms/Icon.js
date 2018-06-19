import React from 'react'
import styled from 'styled-components'
import FontAwesomeIcon from '@fortawesome/react-fontawesome'
import fontawesome from '@fortawesome/fontawesome'

import faHtml5 from '@fortawesome/fontawesome-free-brands/faHtml5'
import faNode from '@fortawesome/fontawesome-free-brands/faNode'
import faPhp from '@fortawesome/fontawesome-free-brands/faPhp'
import faJs from '@fortawesome/fontawesome-free-brands/faJs'
import faAws from '@fortawesome/fontawesome-free-brands/faAws'
import faVuejs from '@fortawesome/fontawesome-free-brands/faVuejs'
import faReact from '@fortawesome/fontawesome-free-brands/faReact'
import faTwitter from '@fortawesome/fontawesome-free-brands/faTwitter'
import faFacebook from '@fortawesome/fontawesome-free-brands/faFacebook'
import faGithub from '@fortawesome/fontawesome-free-brands/faGithub'
import faApple from '@fortawesome/fontawesome-free-brands/faApple'

import Animate from 'components/molecules/Animate'

fontawesome.library.add(
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
