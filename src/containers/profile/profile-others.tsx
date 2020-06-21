import React from "react"

import Lead from "../../components/lead"
import Display from "../../components/display"
import Container from "../../components/container"
import Section from "../../components/section"

const ProfileOthers = () => {
  return (
    <Section>
      <Container>
        <Display>Others</Display>
        <Lead>
          <li>
            リポジトリは<a href="https://github.com/jaxx2104/">こちら</a>
          </li>
          <li>
            過去のデザイン制作は
            <a href="https://old.jaxx2104.info/">こちら</a>
          </li>
        </Lead>
      </Container>
    </Section>
  )
}

export default ProfileOthers
