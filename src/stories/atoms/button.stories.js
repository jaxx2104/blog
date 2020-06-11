import { storiesOf } from "@storybook/react"
import { withKnobs, text } from "@storybook/addon-knobs"
import React from "react"

import Button from "components/atoms/button"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("atoms", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("Button", () => {
  const label = text("label", "label")
  return (
    <React.Fragment>
      <Button path={""} label={label} />
      <Button path={""} label={label} primary />
    </React.Fragment>
  )
})
