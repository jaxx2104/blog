"use client"

import type React from "react"
import styled from "styled-components"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Flex from "../../ui/flex"
import Section from "../../ui/section"

const ProfileLink: React.FC = () => (
  <Section>
    <Container>
      <Display>Links</Display>
      <Flex>
        <LinkWrap>
          <li>
            <a href="https://github.com/jaxx2104">Github</a>
          </li>
          <li>
            <a href="https://twitter.com/jaxx2104">Twitter</a>
          </li>
          <li>
            <a href="https://www.npmjs.com/~jaxx2104">npm</a>
          </li>
          <li>
            <a href="https://speakerdeck.com/jaxx2104">SpeakerDeck</a>
          </li>
          <li>
            <a href="https://qiita.com/jaxx2104">Qiita</a>
          </li>
          <li>
            <a href="https://note.com/jaxx2104">Note</a>
          </li>
          <li>
            <a href="https://www.npmjs.com/~jaxx2104">Connpass</a>
          </li>
        </LinkWrap>
      </Flex>
    </Container>
  </Section>
)

export default ProfileLink

const LinkWrap = styled.div``
