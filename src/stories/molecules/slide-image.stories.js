import { storiesOf } from "@storybook/react"
import { withKnobs, boolean, number, text } from "@storybook/addon-knobs"
import React from "react"
import emergence from "emergence.js"

import SlideImage from "components/molecules/slide-image"
import setStyle from "~/.storybook/setStyle"
import profile from "~/static/img/profile.jpg"

const stories = storiesOf("molecules", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("SlideImage", () => {
  emergence.init()

  const title = text("title", "title")

  return (
    <React.Fragment>
      <SlideImage title={title} src={profile} animation="fadeIn" />
    </React.Fragment>
  )
})
