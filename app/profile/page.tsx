import { Metadata } from "next"
import Layout from "@/components/layout/Layout"
import Container from "@/components/ui/Container"

export const metadata: Metadata = {
  title: "Profile | jaxx2104.info",
  description: "プログラムとバグが好き",
}

export default function ProfilePage() {
  return (
    <Layout>
      <Container>
        <h1>Profile</h1>
        <h2>jaxx2104</h2>
        <p>プログラムとバグが好き</p>
        <h3>Links</h3>
        <ul>
          <li>
            <a
              href="https://github.com/jaxx2104"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </li>
          <li>
            <a
              href="https://twitter.com/jaxx2104"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
          </li>
        </ul>
      </Container>
    </Layout>
  )
}
