import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, number, text } from '@storybook/addon-knobs'
import React from 'react'

import Section from 'components/atoms/section'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('atoms', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('Section', () => {
  const label = text('label', 'label')
  return (
    <React.Fragment>
      <Section>{label}</Section>
      <Section>{label}</Section>
      <Section>{label}</Section>
    </React.Fragment>
  )
})
