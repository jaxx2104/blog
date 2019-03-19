import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, text } from '@storybook/addon-knobs'
import React from 'react'

import Badges from 'components/atoms/badges'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('atoms', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('Badges', () => {
  const label = text('label', 'label')

  return (
    <React.Fragment>
      <Badges items={[label, label]} primary />
      <Badges items={[label, label]} />
    </React.Fragment>
  )
})
