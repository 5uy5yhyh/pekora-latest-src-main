const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');

if (!fs.existsSync(configPath)) {
  throw new Error(
    'Configuration could not be found at location: ' + configPath
  );
}

const config = JSON.parse(
  fs.readFileSync(configPath, 'utf-8')
);

module.exports = {
  reactStrictMode: true,

  serverRuntimeConfig: config.serverRuntimeConfig,
  publicRuntimeConfig: config.publicRuntimeConfig,

  async redirects() {
    return [
      {
        source: '/catalog.aspx',
        destination: '/catalog',
        permanent: true,
      },
      {
        source: '/groups/:id/:name',
        destination: '/My/Groups.aspx?gid=:id',
        permanent: false,
      },
    ];
  },

  // фикс $RefreshSig$ error
  webpack(config, { dev }) {
    return config;
  },
};