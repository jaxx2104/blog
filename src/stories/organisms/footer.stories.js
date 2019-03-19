import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, number, text } from '@storybook/addon-knobs'
import React from 'react'

import Footer from 'components/organisms/footer'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('organisms', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('Footer', () => {
  const label = text('label', 'label')
  return (
    <React.Fragment>
      <Footer title={label} />
    </React.Fragment>
  )
})
