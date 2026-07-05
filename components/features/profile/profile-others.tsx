import Container from "../../ui/container"
import Display from "../../ui/display"
import Section from "../../ui/section"
import styles from "./profile-others.module.css"

const ProfileOthers = () => {
  return (
    <Section>
      <Container>
        <Display>Others</Display>
        <ul className={styles.list}>
          <li>
            リポジトリは<a href="https://github.com/jaxx2104/">こちら</a>
          </li>
          <li>
            過去のデザイン制作は
            <a href="https://old.jaxx2104.info/">こちら</a>
          </li>
        </ul>
      </Container>
    </Section>
  )
}

export default ProfileOthers
