import React from 'react'
import styled from 'styled-components'

import Meta from './Meta'
import Box from 'components/molecules/Box'
import SectionBody from 'components/organisms/SectionBody'
import SectionHead from 'components/organisms/SectionHead'
import SlideImage from 'components/molecules/SlideImage'
import Tumbnail from 'components/atoms/Tumbnail'

const pathPrefix = process.env.NODE_ENV === 'development' ? '' : __PATH_PREFIX__

const Section = styled.section`
  padding: 2rem 0;
  margin: 0 auto;
  text-align: ${props => (props.center ? 'center' : 'left')};
  background-color: ${props =>
    props.image ? `none` : props.primary ? 'rebeccapurple' : 'none'};
  background-image: ${props =>
    props.image
      ? `url(${
          props.image
        }), linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.4))`
      : 'none'};
  background-blend-mode: overlay;
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  color: ${props => (props.primary ? 'white' : '#495057')};
  a {
    color: ${props => (props.primary ? 'white' : '#495057')};
  }
`
const Container = styled.div`
  margin: 0 auto;
  max-width: 960px;
`

const Flex = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-flow: wrap;
  justify-content: center;
`

const Twitter = ({ name }) => (
  <div>
    <a
      href="https://twitter.com/jaxx2104"
      className="twitter-follow-button"
      data-show-count="false"
    >
      Follow @jaxx2104
    </a>
  </div>
)

const UserSection = () => (
  <Section center>
    <Container>
      <Tumbnail src="/img/profile.jpg" title="jaxx2104" circle size={140} />
      <SectionHead small>jaxx2104</SectionHead>
      <p>Front-end engineer.</p>
      <Twitter />
    </Container>
  </Section>
)

const SkillSection = () => (
  <Section primary>
    <Container>
      <SectionHead uppercase>Skill</SectionHead>
      <Flex>
        <Box label="HTML" icon="html5-plain" />
        <Box label="JavaScript" icon="javascript-plain" />
        <Box label="React.js" icon="react-original" />
        <Box label="Vue.js" icon="vuejs-plain" />
        <Box label="Node.js" icon="nodejs-plain" />
        <Box label="PHP" icon="php-plain" />
        <Box label="Swift" icon="swift-plain" />
        <Box label="AWS" icon="amazonwebservices-plain" />
      </Flex>
    </Container>
  </Section>
)

const FeatureSection = () => (
  <Section image="/img/detector.jpg" primary>
    <Container>
      <SectionHead uppercase>Features</SectionHead>
      <SectionBody>
        学生時代バイトをきっかけにWEBエンジニアになりました。
        主にフロントエンドを業務でバリバリやっています、もちろんバックエンドも活躍できます。
        事業を成長させながら技術も誇れるサービスを作れるよう日々精進しています。
      </SectionBody>
    </Container>
  </Section>
)

const WorkSection = () => (
  <Section>
    <Container>
      <SectionHead uppercase>Work</SectionHead>
      <Flex>
        <SlideImage
          src="/img/mockup1.png"
          title="Yomu(PWA)"
          animation="fadeIn"
        />
        <SlideImage
          src="/img/mockup3.png"
          title="Gatstrap(Web)"
          animation="fadeIn"
        />
        <SlideImage
          src="/img/mockup2.png"
          title="Nikuman(Web)"
          animation="fadeIn"
        />
      </Flex>
    </Container>
  </Section>
)

const WorkSpSection = () => (
  <Section>
    <Container>
      <Flex>
        <SlideImage src="/img/work1.png" title="Yomu(iOS)" animation="fadeIn" />
        <SlideImage
          src="/img/work2.png"
          title="Detector(iOS)"
          animation="fadeIn"
        />
      </Flex>
    </Container>
  </Section>
)

const RepoSection = () => (
  <Section primary>
    <Container>
      <SectionHead>Repositories</SectionHead>
      <SectionBody>
        リポジトリは
        <a href="https://github.com/jaxx2104/">こちら</a>
      </SectionBody>
    </Container>
  </Section>
)

const DegreeSection = () => (
  <Section image="/img/back.jpeg" primary>
    <Container>
      <SectionHead>Degree Works</SectionHead>
      <SectionBody>
        過去のデザイン制作は<a href="https://old.jaxx2104.info/">こちら</a>
      </SectionBody>
    </Container>
  </Section>
)

const Profile = () => (
  <div>
    <Meta />
    <UserSection />
    <SkillSection />
    <FeatureSection />
    <WorkSection />
    <WorkSpSection />
    <RepoSection />
    <DegreeSection />
  </div>
)

export default Profile
