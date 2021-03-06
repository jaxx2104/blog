import React from "react"
import styled from "styled-components"

import { FluidObject } from "gatsby-image"
import Tumbnail from "../../components/tumbnail"
import Container from "../../components/container"
import Flex from "../../components/flex"
import Section from "../../components/section"

interface Props {
  profile: FluidObject | FluidObject[] | undefined
}

const ProfileUser: React.FC<Props> = ({ profile }: Props) => (
  <Section>
    <Container>
      <Flex>
        <BioWrap>
          <h2>Futoshi Iwashita</h2>
          <strong>jaxx2104</strong>
          <p> I&apos;m a front-end engineer in Japan 🗼</p>
          <li>2013 ~ 2017: J-CAST News</li>
          <li>2017 ~ : Recruit</li>
          <li>2020 ~ : freee</li>
        </BioWrap>
        <UserWrap>
          <Tumbnail fluid={profile} title="jaxx2104" size={160} />
        </UserWrap>
      </Flex>
    </Container>
  </Section>
)

export default ProfileUser

const UserWrap = styled.div`
  margin: 3rem auto 2rem;
`

const BioWrap = styled.div``
