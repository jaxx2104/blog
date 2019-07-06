import { storiesOf } from "@storybook/react"
import { withKnobs, boolean, number, text } from "@storybook/addon-knobs"
import React from "react"

import Hr from "components/atoms/hr"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("atoms", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("Hr", () => {
  return (
    <React.Fragment>
      <Hr />
    </React.Fragment>
  )
})
