import { storiesOf } from "@storybook/react"
import { withKnobs, boolean, number, text } from "@storybook/addon-knobs"
import React from "react"

import NaviLogo from "components/molecules/navi-logo"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("molecules", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("NaviLogo", () => {
  const title = text("title", "title")

  return (
    <React.Fragment>
      <NaviLogo title={title} />
    </React.Fragment>
  )
})
