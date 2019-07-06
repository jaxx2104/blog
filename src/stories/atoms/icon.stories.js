import { storiesOf } from "@storybook/react"
import { withKnobs, boolean, number, text } from "@storybook/addon-knobs"
import React from "react"

import Icon from "components/atoms/icon"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("atoms", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("Icon", () => {
  const size = number("size", 3)

  return (
    <React.Fragment>
      <Icon name="facebook" size={size} />
      <Icon name="twitter" size={size} />
      <Icon name="github" size={size} />
    </React.Fragment>
  )
})
