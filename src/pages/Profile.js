import get from 'lodash/get'
import React from 'react'
import styled from 'styled-components'
import Img from 'gatsby-image'

import { siteMetadata } from '../../gatsby-config'
import Meta from 'components/atoms/Meta'
import Lead from 'components/atoms/Lead'
import Display from 'components/atoms/Display'
import Tumbnail from 'components/atoms/Tumbnail'
import Box from 'components/molecules/Box'
import Container from 'components/molecules/Container'
import Flex from 'components/molecules/Flex'
import Section from 'components/molecules/Section'
import SlideImage from 'components/molecules/SlideImage'
import Icon from 'components/atoms/Icon'
import Layout from 'components/templates/Layout'
import Hr from 'components/atoms/Hr'

const Anchor = styled.a`
  text-decoration: none;
`

const Wrap = styled.div`
  max-width: 780px;
  position: absolute;
  top: 2rem;
  line-height: 150%;
`

const Cover = styled(Img)`
  height: 50vh;
  width: 100%;
  opacity: 0.6;
  & > img {
    object-fit: cover !important;
    object-position: 0% 50% !important;
  }
`

const UserSection = ({ profile }) => (
  <Section center>
    <Container>
      <Tumbnail
        sizes={get(profile, 'childImageSharp.sizes')}
        title="jaxx2104"
        circle
        size={140}
      />
      <Display size="2">jaxx2104</Display>
      <p>Front-end engineer.</p>
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

const SkillSection = () => (
  <Section primary>
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

const FeatureSection = ({ detector }) => (
  <Section dark nospan>
    <Cover sizes={get(detector, 'childImageSharp.sizes')} />
    <Container>
      <Wrap>
        <Display uppercase>Features</Display>
        <Lead>
          学生時代バイトをきっかけにWEBエンジニアになりました。
          主にフロントエンドを仕事にしていますが、バックエンドの開発もやってます。
          事業を成長させながら技術も誇れるサービスを作れるよう日々精進しています。
        </Lead>
      </Wrap>
    </Container>
  </Section>
)

const WorkSection = ({ mockup1, mockup2, mockup3 }) => (
  <Section>
    <Container>
      <Display uppercase>Work</Display>
      <Flex center>
        <Anchor href="https://yomu.jaxx2104.info/">
          <SlideImage
            sizes={get(mockup1, 'childImageSharp.sizes')}
            title="Yomu(PWA)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://gatstrap.netlify.com/">
          <SlideImage
            sizes={get(mockup3, 'childImageSharp.sizes')}
            title="Gatstrap(Web)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://nikuman.jaxx2104.info/">
          <SlideImage
            sizes={get(mockup2, 'childImageSharp.sizes')}
            title="Nikuman(Web)"
            animation="fadeIn"
          />
        </Anchor>
      </Flex>
    </Container>
  </Section>
)

const WorkSpSection = ({ work1, work2 }) => (
  <Section>
    <Container>
      <Flex center>
        <Anchor href="https://itunes.apple.com/jp/app/yomu-rss-reader/id924321598">
          <SlideImage
            sizes={get(work1, 'childImageSharp.sizes')}
            title="Yomu(iOS)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://itunes.apple.com/jp/app/detector-live-filter-camera/id1079950455">
          <SlideImage
            sizes={get(work2, 'childImageSharp.sizes')}
            title="Detector(iOS)"
            animation="fadeIn"
          />
        </Anchor>
      </Flex>
    </Container>
  </Section>
)

const RepoSection = () => (
  <Section primary>
    <Container>
      <Display>Repositories</Display>
      <Lead>
        リポジトリは
        <a href="https://github.com/jaxx2104/">こちら</a>
      </Lead>
    </Container>
  </Section>
)

const DegreeSection = ({ back }) => (
  <Section dark nospan>
    <Cover sizes={get(back, 'childImageSharp.sizes')} />
    <Container>
      <Wrap>
        <Display>Degree Works</Display>
        <Lead>
          過去のデザイン制作は<a href="https://old.jaxx2104.info/">こちら</a>
        </Lead>
      </Wrap>
    </Container>
  </Section>
)

const Profile = ({ data }) => (
  <Layout>
    <Meta site={siteMetadata} title="Profile" />
    <UserSection profile={get(data, 'profile')} />
    <SkillSection />
    <FeatureSection detector={get(data, 'detector')} />
    <WorkSection
      mockup1={get(data, 'mockup1')}
      mockup2={get(data, 'mockup2')}
      mockup3={get(data, 'mockup3')}
    />
    <WorkSpSection work1={get(data, 'work1')} work2={get(data, 'work2')} />
    <RepoSection />
    <DegreeSection back={get(data, 'back')} />
  </Layout>
)

export default Profile

export const query = graphql`
  query ProfilePageQuery {
    yomu: file(name: { eq: "yomu" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    detector: file(name: { eq: "detector" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    profile: file(name: { eq: "profile" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    mockup1: file(name: { eq: "mockup1" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    mockup2: file(name: { eq: "mockup2" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    mockup3: file(name: { eq: "mockup3" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    work1: file(name: { eq: "work1" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    work2: file(name: { eq: "work2" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
    back: file(name: { eq: "back" }) {
      childImageSharp {
        sizes(quality: 100) {
          ...GatsbyImageSharpSizes_withWebp
        }
      }
    }
  }
`
