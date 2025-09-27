"use client"

import React from "react"
import Display from "../../ui/display"
import Container from "../../ui/container"
import Section from "../../ui/section"

const ProfileOthers = () => {
  return (
    <Section>
      <Container>
        <Display>Others</Display>
        <li>
          リポジトリは<a href="https://github.com/jaxx2104/">こちら</a>
        </li>
        <li>
          過去のデザイン制作は
          <a href="https://old.jaxx2104.info/">こちら</a>
        </li>
      </Container>
    </Section>
  )
}

export default ProfileOthers
