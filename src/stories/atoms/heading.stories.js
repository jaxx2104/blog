import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, number, text } from '@storybook/addon-knobs'
import React from 'react'

import Heading from 'components/atoms/heading'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('atoms', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('Heading', () => {
  const label = text('label', 'label')
  return (
    <React.Fragment>
      <Heading>{label}</Heading>
    </React.Fragment>
  )
})
