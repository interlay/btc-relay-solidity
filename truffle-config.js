const path = require('path')
require('./dotenv')

const solc = {
  version: '0.6.6', // Fetch exact version from solc-bin (default: truffle's version)
  optimizer: {
    enabled: true,
    runs: 200
  }
  // evmVersion: 'istanbul'
}

// truffle seems to have issues with native compiler
// see https://github.com/trufflesuite/truffle/pull/3002
if (process.env.SOLC_PATH) {
  // solc.version = process.env.SOLC_PATH
  process.env.PATH = path.dirname(process.env.SOLC_PATH) + ':' + process.env.PATH
  solc.version = 'native'
  // solc.evmVersion = 'txchain'
}

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: 'localhost',
      port: parseInt(process.env.NODE_PORT || '8545', 10),
      network_id: '*'
    }
  },
  mocha: {
    enableTimeouts: false,
    useColors: true
  },
  compilers: {
    solc: solc
  }
}
