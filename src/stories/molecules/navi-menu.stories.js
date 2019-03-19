import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, number, text } from '@storybook/addon-knobs'
import React from 'react'

import NaviMenu from 'components/molecules/navi-menu'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('molecules', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('NaviMenu', () => {
  const title = text('title', 'title')

  return (
    <React.Fragment>
      <NaviMenu
        items={[{ text: 'Home', to: '/' }, { text: 'Profile', to: '/profile' }]}
      />
    </React.Fragment>
  )
})
