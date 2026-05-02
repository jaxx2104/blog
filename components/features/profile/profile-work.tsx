import type React from "react"
import Container from "../../ui/container"
import Display from "../../ui/display"
import Flex from "../../ui/flex"
import Section from "../../ui/section"
import SlideImage from "../../ui/slide-image"
import styles from "./profile-work.module.css"

interface WorkItem {
  src: string
  title: string
  href: string
}

interface Props {
  workItems?: WorkItem[]
}

const defaultWorkItems: WorkItem[] = [
  {
    src: "/images/kawaii.png",
    title: "Kawaii.fm",
    href: "https://kawaii.jaxx2104.info/",
  },
  {
    src: "/images/mockup1.png",
    title: "Yomu(PWA)",
    href: "https://yomu.jaxx2104.info/",
  },
  {
    src: "/images/mockup3.png",
    title: "Gatstrap(Web)",
    href: "https://gatstrap.netlify.com/",
  },
  {
    src: "/images/mockup2.png",
    title: "Nikuman(Web)",
    href: "https://nikuman.jaxx2104.info/",
  },
  {
    src: "/images/work1.png",
    title: "Yomu(iOS)",
    href: "https://itunes.apple.com/jp/app/yomu-rss-reader/id924321598",
  },
  {
    src: "/images/work2.png",
    title: "Detector(iOS)",
    href: "https://itunes.apple.com/jp/app/detector-live-filter-camera/id1079950455",
  },
]

const ProfileWork: React.FC<Props> = ({
  workItems = defaultWorkItems,
}) => (
  <Section>
    <Container>
      <Display $uppercase>Work</Display>
      <Flex $center>
        {workItems.map((item, index) => (
          <a key={index} href={item.href} className={styles.anchor}>
            <SlideImage
              src={item.src}
              alt={item.title}
              title={item.title}
              animation="fadeIn"
            />
          </a>
        ))}
      </Flex>
    </Container>
  </Section>
)

export default ProfileWork
