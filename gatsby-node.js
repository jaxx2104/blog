const each = require('lodash/each')
const Promise = require('bluebird')
const path = require('path')
const PostTemplate = path.resolve('./src/components/templates/PostTemplate.js')

exports.createPages = ({ graphql, boundActionCreators }) => {
  const { createPage } = boundActionCreators

  return new Promise((resolve, reject) => {
    resolve(
      graphql(
        `
          {
            allFile(filter: { extension: { regex: "/md|js/" } }, limit: 1000) {
              edges {
                node {
                  id
                  name: sourceInstanceName
                  path: absolutePath
                  remark: childMarkdownRemark {
                    id
                    frontmatter {
                      layout
                      path
                    }
                  }
                }
              }
            }
          }
        `
      ).then(({ errors, data }) => {
        if (errors) {
          console.log(errors)
          reject(errors)
        }

        // Create blog posts & pages.
        const items = data.allFile.edges
        const posts = items.filter(({ node }) => /posts/.test(node.name))
        each(posts, ({ node }) => {
          const { path } = node.remark.frontmatter
          createPage({
            path,
            component: PostTemplate,
            context: { path },
          })
        })

        const pages = items.filter(({ node }) => /page/.test(node.name))
        each(pages, ({ node }) => {
          const { name } = path.parse(node.path)
          const PageTemplate = path.resolve(node.path)
          createPage({
            path: name,
            component: PageTemplate,
            context: { path: name },
          })
        })
      })
    )
  })
}

exports.modifyWebpackConfig = ({ config, _stage }) => {
  return config.merge({
    resolve: {
      alias: {
        components: path.resolve(config._config.context, 'src/components'),
      },
    },
  })
}
