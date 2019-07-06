import { storiesOf } from "@storybook/react"
import { withKnobs, boolean, number, text } from "@storybook/addon-knobs"
import React from "react"

import Navi from "components/organisms/navi"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("organisms", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("Navi", () => {
  const label = text("label", "label")
  return (
    <React.Fragment>
      <Navi title={label} />
    </React.Fragment>
  )
})
