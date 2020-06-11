import { storiesOf } from "@storybook/react"
import { withKnobs, text } from "@storybook/addon-knobs"
import React from "react"

import Time from "components/atoms/time"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("atoms", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("Time", () => {
  const label = text("label", "YYYY/MM/DD")
  return (
    <React.Fragment>
      <Time date={label} />
    </React.Fragment>
  )
})
