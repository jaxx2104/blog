"use client"

import React from "react"
import styled from "styled-components"
import Container from "../../ui/container"
import Flex from "../../ui/flex"
import Section from "../../ui/section"
import Display from "../../ui/display"
import Thumbnail from "./thumbnail"

interface Props {
  profileImage?: string
}

const ProfileUser: React.FC<Props> = ({
  profileImage = "/images/profile.jpg",
}: Props) => (
  <Section>
    <Container>
      <Flex>
        <BioWrap>
          <Display>Futoshi Iwashita</Display>
          <strong>jaxx2104</strong>
          <p>I&apos;m a front-end engineer in Japan 🗼</p>
          <li>2013 ~ 2017: J-CAST</li>
          <li>2017 ~ 2020: Recruit</li>
          <li>2020 ~ : freee</li>
        </BioWrap>
        <UserWrap>
          <Thumbnail src={profileImage} title="jaxx2104" size={160} circle />
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
