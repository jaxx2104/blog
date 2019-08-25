module.exports = {
  // Allow the agent to pick up the current commit message
  includeCommitMessage: true,
  webpack: {
    // Set relative path to Webpack stats JSON file
    stats: "./artifacts/webpack-stats.json"
  }
}
