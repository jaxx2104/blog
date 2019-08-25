const each = require("lodash/each")
const Promise = require("bluebird")
const path = require("path")
const PostTemplate = path.resolve("./src/components/templates/post-template.js")
const StatsPlugin = require("stats-webpack-plugin")

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions

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
          if (!node.remark) return
          const { path } = node.remark.frontmatter
          createPage({
            path,
            component: PostTemplate
          })
        })

        const pages = items.filter(({ node }) => /page/.test(node.name))
        each(pages, ({ node }) => {
          if (!node.remark) return
          const { name } = path.parse(node.path)
          const PageTemplate = path.resolve(node.path)
          createPage({
            path: name,
            component: PageTemplate
          })
        })
      })
    )
  })
}

exports.onCreateWebpackConfig = ({ actions, stage }) => {
  if (stage === "build-javascript") {
    actions.setWebpackConfig({
      plugins: [
        new StatsPlugin("../artifacts/webpack-stats.json", {
          all: false,
          assets: true,
          modules: true,
          chunks: true
        })
      ]
    })
  }

  actions.setWebpackConfig({
    resolve: {
      alias: {
        "~": __dirname,
        components: path.resolve(__dirname, "src/components"),
        plugins: path.resolve(__dirname, "src/plugins"),
        styles: path.resolve(__dirname, "src/styles")
      }
    }
  })
}
