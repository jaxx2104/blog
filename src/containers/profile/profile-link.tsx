/* eslint-disable prettier/prettier */
import React from "react"
import styled from "styled-components"

import Container from "../../components/container"
import Section from "../../components/section"
import Display from "../../components/display"
import Flex from "../../components/flex"

const ProfileLink: React.FC = () => (
  <Section >
    <Container>
      <Display>Links</Display>
      <Flex>
        <LinkWrap>
          <li><a href='https://github.com/jaxx2104'>Github</a></li>
          <li><a href="https://twitter.com/jaxx2104">Twitter</a></li>
          <li><a href='https://www.npmjs.com/~jaxx2104'>npm</a></li>
          <li><a href='https://speakerdeck.com/jaxx2104'>SpeakerDeck</a></li>
          <li><a href='https://qiita.com/jaxx2104'>Qiita</a></li>
          <li><a href='https://note.com/jaxx2104'>Note</a></li>
          <li><a href='https://www.npmjs.com/~jaxx2104'>Connpass</a></li>
        </LinkWrap>
      </Flex>
    </Container>
  </Section>
)

export default ProfileLink

const LinkWrap = styled.div``
