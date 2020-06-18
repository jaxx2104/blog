import React from "react"
import styled from "styled-components"

import { FluidObject } from "gatsby-image"
import Display from "../../components/display"
import Tumbnail from "../../components/tumbnail"
import Container from "../../components/container"
import Flex from "../../components/flex"
import Section from "../../components/section"
import Icon from "../../components/icon/icon"
import Hr from "../../components/hr"

interface Props {
  profile: FluidObject | FluidObject[] | undefined
}

const ProfileUser: React.FC<Props> = ({ profile }: Props) => (
  <Section>
    <Container>
      <Display>Profile</Display>
      <Flex center>
        <UserWrap>
          <Tumbnail fluid={profile} title="jaxx2104" circle size={120} />
        </UserWrap>
        <BioWrap>
          <h2>Futoshi Iwashita</h2>
          <p>jaxx2104</p>
          <p> I&apos;m a front-end engineer in Japan 🗼</p>
          <li>2013 ~ 2017: J-CAST News</li>
          <li>2017 ~ : Recruit Lifestyle</li>
          <Hr />
          <Flex center>
            <Anchor href="https://www.facebook.com/futoshi.iwashita">
              <Icon name="facebook" size={1} />
            </Anchor>
            <Anchor href="https://twitter.com/jaxx2104">
              <Icon name="twitter" size={1} />
            </Anchor>
            <Anchor href="https://github.com/jaxx2104">
              <Icon name="github" size={1} />
            </Anchor>
          </Flex>
        </BioWrap>
      </Flex>
    </Container>
  </Section>
)

export default ProfileUser

const Anchor = styled.a`
  text-decoration: none;
`

const UserWrap = styled.div`
  width: 240px;
`

const BioWrap = styled.div``
