import { storiesOf } from "@storybook/react"
import { withKnobs } from "@storybook/addon-knobs"
import React from "react"

import IconBox from "components/molecules/icon-box"
import setStyle from "~/.storybook/setStyle"

const stories = storiesOf("molecules", module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add("IconBox", () => {
  return (
    <React.Fragment>
      <IconBox label="HTML" icon="html5" />
      <IconBox label="JavaScript" icon="js" />
      <IconBox label="React.js" icon="react" />
      <IconBox label="Vue.js" icon="vuejs" />
      <IconBox label="Node.js" icon="node" />
      <IconBox label="PHP" icon="php" />
      <IconBox label="AWS" icon="aws" />
      <IconBox label="Swift" icon="apple" />
    </React.Fragment>
  )
})
