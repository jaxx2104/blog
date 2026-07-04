import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Section from "../../ui/section"
import styles from "./profile-link.module.css"

interface LinkItem {
  label: string
  href: string
}

const links: LinkItem[] = [
  { label: "Github", href: "https://github.com/jaxx2104" },
  { label: "Twitter", href: "https://twitter.com/jaxx2104" },
  { label: "npm", href: "https://www.npmjs.com/~jaxx2104" },
  { label: "SpeakerDeck", href: "https://speakerdeck.com/jaxx2104" },
  { label: "Qiita", href: "https://qiita.com/jaxx2104" },
  { label: "Note", href: "https://note.com/jaxx2104" },
  { label: "Connpass", href: "https://www.npmjs.com/~jaxx2104" },
]

const ProfileLink: React.FC = () => (
  <Section>
    <Container>
      <Display>Links</Display>
      <ul className={styles.list}>
        {links.map((link) => (
          <li key={link.label} className={styles.item}>
            <a className={styles.link} href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </Container>
  </Section>
)

export default ProfileLink
