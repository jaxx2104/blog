import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Section from "../../ui/section"
import styles from "./profile-user.module.css"
import Thumbnail from "./thumbnail"

interface Props {
  profileImage?: string
}

const career = [
  { term: "2013 — 2017", place: "J-CAST" },
  { term: "2017 — 2020", place: "Recruit" },
  { term: "2020 —", place: "freee" },
]

const ProfileUser: React.FC<Props> = ({
  profileImage = "/images/profile.jpg",
}) => (
  <Section>
    <Container>
      <div className={styles.layout}>
        <div className={styles.intro}>
          <p className={styles.handle}>jaxx2104</p>
          <Display>Futoshi Iwashita</Display>
          <p className={styles.bio}>
            I&apos;m a front-end engineer in Japan 🗼
          </p>
          <ul className={styles.timeline}>
            {career.map((item) => (
              <li key={item.place} className={styles.entry}>
                <span className={styles.term}>{item.term}</span>
                <span className={styles.place}>{item.place}</span>
              </li>
            ))}
          </ul>
        </div>
        <figure className={styles.portrait}>
          <Thumbnail src={profileImage} title="jaxx2104" size={180} />
          <figcaption className={styles.caption}>Tokyo, JP</figcaption>
        </figure>
      </div>
    </Container>
  </Section>
)

export default ProfileUser
