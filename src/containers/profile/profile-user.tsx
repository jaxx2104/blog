import React from "react"
import styled from "styled-components"

import { IGatsbyImageData } from "gatsby-plugin-image"
import Tumbnail from "../../components/tumbnail"
import Container from "../../components/container"
import Flex from "../../components/flex"
import Section from "../../components/section"
import Display from "../../components/display"

interface Props {
  profile: IGatsbyImageData | IGatsbyImageData[] | undefined
}

const ProfileUser: React.FC<Props> = ({ profile }: Props) => (
  <Section>
    <Container>
      <Flex>
        <BioWrap>
          <Display>Futoshi Iwashita</Display>
          <strong>jaxx2104</strong>
          <p> I&apos;m a front-end engineer in Japan 🗼</p>
          <li>2013 ~ 2017: J-CAST</li>
          <li>2017 ~ 2020: Recruit</li>
          <li>2020 ~ : freee</li>
        </BioWrap>
        <UserWrap>
          {profile instanceof Array ? (
            profile.map((f, i) => (
              <Tumbnail key={i} fluid={f} title="jaxx2104" size={160} />
            ))
          ) : (
            <Tumbnail fluid={profile} title="jaxx2104" size={160} />
          )}
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
