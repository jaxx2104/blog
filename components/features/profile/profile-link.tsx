import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Section from "../../ui/section"
import styles from "./profile-link.module.css"

const LINKS: { text: string; href: string }[] = [
  { text: "Github", href: "https://github.com/jaxx2104" },
  { text: "Twitter", href: "https://twitter.com/jaxx2104" },
  { text: "npm", href: "https://www.npmjs.com/~jaxx2104" },
  { text: "SpeakerDeck", href: "https://speakerdeck.com/jaxx2104" },
  { text: "Qiita", href: "https://qiita.com/jaxx2104" },
  { text: "Note", href: "https://note.com/jaxx2104" },
  { text: "Connpass", href: "https://connpass.com/user/jaxx2104/" },
]

const ProfileLink: React.FC = () => (
  <Section>
    <Container>
      <Display>Links</Display>
      <div className={styles.links}>
        {LINKS.map((link) => (
          <a key={link.text} className={styles.btn} href={link.href}>
            {link.text}
          </a>
        ))}
      </div>
    </Container>
  </Section>
)

export default ProfileLink
