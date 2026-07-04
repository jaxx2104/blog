import Container from "../../ui/container"
import Display from "../../ui/display"
import Section from "../../ui/section"
import styles from "./profile-others.module.css"

const ProfileOthers = () => (
  <Section>
    <Container>
      <Display>Others</Display>
      <ul className={styles.list}>
        <li className={styles.item}>
          リポジトリは
          <a className={styles.link} href="https://github.com/jaxx2104/">
            こちら
          </a>
        </li>
        <li className={styles.item}>
          過去のデザイン制作は
          <a className={styles.link} href="https://old.jaxx2104.info/">
            こちら
          </a>
        </li>
      </ul>
    </Container>
  </Section>
)

export default ProfileOthers
