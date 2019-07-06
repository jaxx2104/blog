import { storiesOf } from "@storybook/react"
import { withKnobs, boolean, number, text } from "@storybook/addon-knobs"
import React from "react"

import Tumbnail from "components/atoms/tumbnail"
import setStyle from "~/.storybook/setStyle"
import profile from "~/static/img/profile.jpg"

const stories = storiesOf("atoms", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("Tumbnail", () => {
  const title = text("title", "title")
  const circle = boolean("circle", true)
  const size = number("size", 140)

  return (
    <React.Fragment>
      <Tumbnail src={profile} title={title} circle={circle} size={size} />
    </React.Fragment>
  )
})
