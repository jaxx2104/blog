import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import React from "react"

import IconShare from "components/molecules/icon-share"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("molecules", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("IconShare", () => {
  return (
    <React.Fragment>
      <IconShare />
    </React.Fragment>
  )
})
