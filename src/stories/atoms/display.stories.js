import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, number, text } from '@storybook/addon-knobs'
import React from 'react'

import Display from 'components/atoms/display'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('atoms', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('Display', () => {
  const label = text('label', 'label')
  const size = number('size', 3)
  const uppercase = boolean('uppercase', false)
  return (
    <React.Fragment>
      <Display size={size} uppercase={uppercase}>
        {label}
      </Display>
    </React.Fragment>
  )
})
