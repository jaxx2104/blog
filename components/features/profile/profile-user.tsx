import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Flex from "../../ui/flex"
import Section from "../../ui/section"
import styles from "./profile-user.module.css"
import Thumbnail from "./thumbnail"

interface Props {
  profileImage?: string
}

const ProfileUser: React.FC<Props> = ({
  profileImage = "/images/profile.jpg",
}) => (
  <Section>
    <Container>
      <Flex>
        <div>
          <Display>Futoshi Iwashita</Display>
          <strong>jaxx2104</strong>
          <p>I&apos;m a front-end engineer in Japan 🗼</p>
          <li>2013 ~ 2017: J-CAST</li>
          <li>2017 ~ 2020: Recruit</li>
          <li>2020 ~ : freee</li>
        </div>
        <div className={styles.user}>
          <Thumbnail src={profileImage} title="jaxx2104" size={160} circle />
        </div>
      </Flex>
    </Container>
  </Section>
)

export default ProfileUser
