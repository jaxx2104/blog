import { graphql } from 'gatsby'
import get from 'lodash/get'
import React from 'react'
import styled from 'styled-components'
import Img from 'gatsby-image'

import { siteMetadata } from '~/gatsby-config'
import Meta from 'components/atoms/meta'
import Lead from 'components/atoms/lead'
import Display from 'components/atoms/display'
import Tumbnail from 'components/atoms/tumbnail'
import Box from 'components/molecules/icon-box'
import Container from 'components/atoms/container'
import Flex from 'components/atoms/flex'
import Section from 'components/atoms/section'
import SlideImage from 'components/molecules/slide-image'
import Icon from 'components/atoms/icon'
import Layout from 'components/templates/layout'
import Hr from 'components/atoms/hr'

const UserSection = ({ profile }) => (
  <Section center>
    <Container>
      <Tumbnail
        fluid={get(profile, 'childImageSharp.fluid')}
        title="jaxx2104"
        circle
        size={140}
      />
      <Display>Futoshi Iwashita</Display>
      <p> jaxx2104</p>
      <p> I'm a front-end engineer in Japan 🗼</p>
      <li>2013 ~ 2017: J-CAST News</li>
      <li>2017 ~ : Recruit Lifestyle</li>
      <Hr />
      <Flex center>
        <Anchor href="https://www.facebook.com/futoshi.iwashita">
          <Icon name="facebook" size="1" />
        </Anchor>
        <Anchor href="https://twitter.com/jaxx2104">
          <Icon name="twitter" size="1" />
        </Anchor>
        <Anchor href="https://github.com/jaxx2104">
          <Icon name="github" size="1" />
        </Anchor>
      </Flex>
    </Container>
  </Section>
)

const SkillSection = ({ detector }) => (
  <Section dark>
    <Cover fluid={get(detector, 'childImageSharp.fluid')} />
    <Container>
      <Display uppercase>Skill</Display>
      <Flex center>
        <Box label="HTML" icon="html5" />
        <Box label="JavaScript" icon="js" />
        <Box label="React.js" icon="react" />
        <Box label="Vue.js" icon="vuejs" />
        <Box label="Node.js" icon="node" />
        <Box label="PHP" icon="php" />
        <Box label="AWS" icon="aws" />
        <Box label="Swift" icon="apple" />
      </Flex>
    </Container>
  </Section>
)

const WorkSection = ({ mockup1, mockup2, mockup3, work1, work2 }) => (
  <Section>
    <Container>
      <Display uppercase>Work</Display>
      <Flex center>
        <Anchor href="https://yomu.jaxx2104.info/">
          <SlideImage
            fluid={get(mockup1, 'childImageSharp.fluid')}
            title="Yomu(PWA)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://gatstrap.netlify.com/">
          <SlideImage
            fluid={get(mockup3, 'childImageSharp.fluid')}
            title="Gatstrap(Web)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://nikuman.jaxx2104.info/">
          <SlideImage
            fluid={get(mockup2, 'childImageSharp.fluid')}
            title="Nikuman(Web)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://itunes.apple.com/jp/app/yomu-rss-reader/id924321598">
          <SlideImage
            fluid={get(work1, 'childImageSharp.fluid')}
            title="Yomu(iOS)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://itunes.apple.com/jp/app/detector-live-filter-camera/id1079950455">
          <SlideImage
            fluid={get(work2, 'childImageSharp.fluid')}
            title="Detector(iOS)"
            animation="fadeIn"
          />
        </Anchor>
      </Flex>
    </Container>
  </Section>
)

const DegreeSection = ({ back }) => (
  <Section dark>
    <Cover fluid={get(back, 'childImageSharp.fluid')} />
    <Container>
      <Display>Others</Display>
      <Lead>
        <li>
          リポジトリは<a href="https://github.com/jaxx2104/">こちら</a>
        </li>
        <li>
          過去のデザイン制作は
          <a href="https://old.jaxx2104.info/">こちら</a>
        </li>
      </Lead>
    </Container>
  </Section>
)

const Profile = ({ data }) => (
  <Layout>
    <Meta site={siteMetadata} title="Profile" />
    <UserSection profile={get(data, 'profile')} />
    <SkillSection detector={data.detector} />
    <WorkSection
      mockup1={get(data, 'mockup1')}
      mockup2={get(data, 'mockup2')}
      mockup3={get(data, 'mockup3')}
      work1={get(data, 'work1')}
      work2={get(data, 'work2')}
    />
    <DegreeSection back={data.back} />
  </Layout>
)

export default Profile

export const query = graphql`
  query ProfilePageQuery {
    yomu: file(name: { eq: "yomu" }) {
      childImageSharp {
        fluid(maxWidth: 700) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    detector: file(name: { eq: "detector" }) {
      childImageSharp {
        fluid(maxWidth: 700) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    profile: file(name: { eq: "profile" }) {
      childImageSharp {
        fluid(maxWidth: 700) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    mockup1: file(name: { eq: "mockup1" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    mockup2: file(name: { eq: "mockup2" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    mockup3: file(name: { eq: "mockup3" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    work1: file(name: { eq: "work1" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    work2: file(name: { eq: "work2" }) {
      childImageSharp {
        fluid(maxWidth: 200) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
    back: file(name: { eq: "back" }) {
      childImageSharp {
        fluid(maxWidth: 700) {
          ...GatsbyImageSharpFluid_withWebp_tracedSVG
        }
      }
    }
  }
`

const Anchor = styled.a`
  text-decoration: none;
`

const Cover = styled(Img)`
  position: absolute !important;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  z-index: -1;

  & > img {
    position: absolute !important;
    object-fit: cover !important;
    object-position: 50% 50% !important;
  }
`
