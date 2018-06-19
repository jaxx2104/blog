import get from 'lodash/get'
import React from 'react'
import styled from 'styled-components'

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

const UserSection = () => (
  <Section center>
    <Container>
      <Tumbnail src="/img/profile.jpg" title="jaxx2104" circle size={140} />
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

const FeatureSection = () => (
  <Section image="/img/detector.jpg" primary>
    <Container>
      <Display uppercase>Features</Display>
      <Lead>
        学生時代バイトをきっかけにWEBエンジニアになりました。
        主にフロントエンドを仕事にしていますが、バックエンドの開発もやってます。
        事業を成長させながら技術も誇れるサービスを作れるよう日々精進しています。
      </Lead>
    </Container>
  </Section>
)

const WorkSection = () => (
  <Section>
    <Container>
      <Display uppercase>Work</Display>
      <Flex center>
        <Anchor href="https://yomu.jaxx2104.info/">
          <SlideImage
            src="/img/mockup1.png"
            title="Yomu(PWA)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://gatstrap.netlify.com/">
          <SlideImage
            src="/img/mockup3.png"
            title="Gatstrap(Web)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://nikuman.jaxx2104.info/">
          <SlideImage
            src="/img/mockup2.png"
            title="Nikuman(Web)"
            animation="fadeIn"
          />
        </Anchor>
      </Flex>
    </Container>
  </Section>
)

const WorkSpSection = () => (
  <Section>
    <Container>
      <Flex center>
        <Anchor href="https://itunes.apple.com/jp/app/yomu-rss-reader/id924321598">
          <SlideImage
            src="/img/work1.png"
            title="Yomu(iOS)"
            animation="fadeIn"
          />
        </Anchor>
        <Anchor href="https://itunes.apple.com/jp/app/detector-live-filter-camera/id1079950455">
          <SlideImage
            src="/img/work2.png"
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

const DegreeSection = () => (
  <Section image="/img/back.jpeg" primary>
    <Container>
      <Display>Degree Works</Display>
      <Lead>
        過去のデザイン制作は<a href="https://old.jaxx2104.info/">こちら</a>
      </Lead>
    </Container>
  </Section>
)

const Profile = () => (
  <Layout>
    <Meta site={siteMetadata} title="Profile" />
    <UserSection />
    <SkillSection />
    <FeatureSection />
    <WorkSection />
    <WorkSpSection />
    <RepoSection />
    <DegreeSection />
  </Layout>
)

export default Profile
