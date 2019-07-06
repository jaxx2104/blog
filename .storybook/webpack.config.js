const webpack = require("webpack")
const path = require("path")

module.exports = ({ config }) => {
  // Transpile Gatsby module because Gastby includes un-transpiled ES6 code.
  config.module.rules[0].exclude = [/node_modules\/(?!(gatsby)\/)/]
  // use installed babel-loader which is v8.0-beta (which is meant to work with @babel/core@7)
  config.module.rules[0].use[0].loader = require.resolve("babel-loader")

  // use @babel/preset-react for JSX and env (instead of staged presets)
  config.module.rules[0].use[0].options.presets = [
    require.resolve("@babel/preset-react"),
    require.resolve("@babel/preset-env")
  ]

  // use @babel/plugin-proposal-class-properties for class arrow functions
  config.module.rules[0].use[0].options.plugins = [
    require.resolve("@babel/plugin-proposal-class-properties"),
    require.resolve("babel-plugin-remove-graphql-queries")
  ]

  // use babel-plugin-styled-components
  config.module.rules[0].use[0].options.plugins = [
    require.resolve("babel-plugin-styled-components")
  ]

  // custom config
  config.resolve.alias["~"] = path.resolve(__dirname, "../")
  config.resolve.alias["components"] = path.resolve(
    __dirname,
    "../src/components"
  )
  config.resolve.alias["styles"] = path.resolve(__dirname, "../src/styles")
  config.resolve.alias["images"] = path.resolve(__dirname, "../src/images")
  return config
}
