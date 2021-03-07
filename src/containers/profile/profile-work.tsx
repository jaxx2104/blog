import React from "react"
import styled from "styled-components"

import { FluidObject } from "gatsby-image"
import Display from "../../components/display"
import Container from "../../components/container"
import Flex from "../../components/flex"
import Section from "../../components/section"
import SlideImage from "../../components/slide-image"

interface Props {
  kawaii: FluidObject | FluidObject[] | undefined
  mockup1: FluidObject | FluidObject[] | undefined
  mockup2: FluidObject | FluidObject[] | undefined
  mockup3: FluidObject | FluidObject[] | undefined
  work1: FluidObject | FluidObject[] | undefined
  work2: FluidObject | FluidObject[] | undefined
}

const ProfileWork: React.FC<Props> = ({
  kawaii,
  mockup1,
  mockup2,
  mockup3,
  work1,
  work2,
}: Props) => (
  <Section>
    <Container>
      <Display uppercase>Work</Display>
      <Flex center>
        <Anchor href="https://kawaii.jaxx2104.info/">
          <SlideImage fluid={kawaii} title="Kawaii.fm" animation="fadeIn" />
        </Anchor>
        <Anchor href="https://yomu.jaxx2104.info/">
          <SlideImage fluid={mockup1} title="Yomu(PWA)" animation="fadeIn" />
        </Anchor>
        <Anchor href="https://gatstrap.netlify.com/">
          <SlideImage
            fluid={mockup3}
            title="Gatstrap(Web)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://nikuman.jaxx2104.info/">
          <SlideImage fluid={mockup2} title="Nikuman(Web)" animation="fadeIn" />
        </Anchor>
        <Anchor href="https://itunes.apple.com/jp/app/yomu-rss-reader/id924321598">
          <SlideImage fluid={work1} title="Yomu(iOS)" animation="fadeIn" />
        </Anchor>
        <Anchor href="https://itunes.apple.com/jp/app/detector-live-filter-camera/id1079950455">
          <SlideImage fluid={work2} title="Detector(iOS)" animation="fadeIn" />
        </Anchor>
      </Flex>
    </Container>
  </Section>
)

export default ProfileWork

const Anchor = styled.a`
  text-decoration: none;
`
