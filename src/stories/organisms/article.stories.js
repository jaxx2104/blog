import { storiesOf } from '@storybook/react'
import { withKnobs, boolean, number, text } from '@storybook/addon-knobs'
import React from 'react'

import Article from 'components/organisms/article'
import setStyle from '~/.storybook/setStyle'

const stories = storiesOf('organisms', module)

stories.addDecorator(withKnobs)
setStyle(stories)

stories.add('Article', () => {
  const title = text('title', 'title')
  const date = text('date', 'YYYY/MM/DD')
  const tag = text('tag', 'tag')
  const category = text('category', 'category')

  return (
    <React.Fragment>
      <Article
        frontmatter={{
          title,
          date,
          category: [category],
          tags: [tag],
        }}
        html={'saple text'}
        site={{}}
        options={{
          isIndex: false,
          adsense: null,
        }}
      />
    </React.Fragment>
  )
})
