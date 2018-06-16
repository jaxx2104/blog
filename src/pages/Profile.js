import React from 'react'

import Meta from 'components/atoms/Meta'
import Lead from 'components/atoms/Lead'
import Display from 'components/atoms/Display'
import Tumbnail from 'components/atoms/Tumbnail'

import Box from 'components/molecules/Box'
import Container from 'components/molecules/Container'
import Flex from 'components/molecules/Flex'
import Section from 'components/molecules/Section'
import SlideImage from 'components/molecules/SlideImage'
import Twitter from 'components/molecules/Twitter'
import Layout from 'components/templates/Layout'
import Hr from 'components/atoms/Hr'

const UserSection = () => (
  <Section center>
    <Container>
      <Tumbnail src="/img/profile.jpg" title="jaxx2104" circle size={140} />
      <Display small>jaxx2104</Display>
      <Hr />
      <p>Front-end engineer.</p>
      <Twitter />
    </Container>
  </Section>
)

const SkillSection = () => (
  <Section primary>
    <Container>
      <Display uppercase>Skill</Display>
      <Flex center>
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
      <Display uppercase>Features</Display>
      <Lead>
        学生時代バイトをきっかけにWEBエンジニアになりました。
        主にフロントエンドを業務でバリバリやっています、もちろんバックエンドも活躍できます。
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
      <Flex center>
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
    <Meta />
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
