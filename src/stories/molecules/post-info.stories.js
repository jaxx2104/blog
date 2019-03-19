import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, number, text } from '@storybook/addon-knobs'
import React from 'react'

import PostInfo from 'components/molecules/post-info'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('molecules', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('PostInfo', () => {
  const title = text('title', 'title')
  const date = text('date', 'YYYY/MM/DD')
  const tag = text('tag', 'tag')
  const category = text('category', 'category')

  return (
    <React.Fragment>
      <PostInfo
        title={title}
        date={date}
        categories={[category]}
        tags={[tag]}
      />
    </React.Fragment>
  )
})
