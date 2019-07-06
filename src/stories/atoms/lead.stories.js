import { storiesOf } from "@storybook/react"
import { withKnobs, boolean, number, text } from "@storybook/addon-knobs"
import React from "react"

import Lead from "components/atoms/lead"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("atoms", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("Lead", () => {
  const label = text("label", "label")
  return (
    <React.Fragment>
      <Lead>{label}</Lead>
    </React.Fragment>
  )
})
