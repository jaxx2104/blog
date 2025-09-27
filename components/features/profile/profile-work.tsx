"use client"

import React from "react"
import styled from "styled-components"
import Display from "../../ui/display"
import Container from "../../ui/container"
import Flex from "../../ui/flex"
import Section from "../../ui/section"
import SlideImage from "../../ui/slide-image"

interface WorkItem {
  src: string
  title: string
  href: string
}

interface Props {
  workItems?: WorkItem[]
}

const ProfileWork: React.FC<Props> = ({
  workItems = defaultWorkItems,
}: Props) => (
  <Section>
    <Container>
      <Display $uppercase>Work</Display>
      <Flex $center>
        {workItems.map((item, index) => (
          <Anchor key={index} href={item.href}>
            <SlideImage
              src={item.src}
              alt={item.title}
              title={item.title}
              animation="fadeIn"
            />
          </Anchor>
        ))}
      </Flex>
    </Container>
  </Section>
)

const defaultWorkItems: WorkItem[] = [
  {
    src: "/images/kawaii.png",
    title: "Kawaii.fm",
    href: "https://kawaii.jaxx2104.info/",
  },
  {
    src: "/images/mockup1.png",
    title: "Yomu(PWA)",
    href: "https://yomu.jaxx2104.info/",
  },
  {
    src: "/images/mockup3.png",
    title: "Gatstrap(Web)",
    href: "https://gatstrap.netlify.com/",
  },
  {
    src: "/images/mockup2.png",
    title: "Nikuman(Web)",
    href: "https://nikuman.jaxx2104.info/",
  },
  {
    src: "/images/work1.png",
    title: "Yomu(iOS)",
    href: "https://itunes.apple.com/jp/app/yomu-rss-reader/id924321598",
  },
  {
    src: "/images/work2.png",
    title: "Detector(iOS)",
    href: "https://itunes.apple.com/jp/app/detector-live-filter-camera/id1079950455",
  },
]

export default ProfileWork

const Anchor = styled.a`
  text-decoration: none;
`
