require('@nomiclabs/hardhat-ganache');
require('@nomiclabs/hardhat-waffle');
require('hardhat-typechain');
import '@nomiclabs/hardhat-ethers';
// require('buidler-gas-reporter');

const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const ROPSTEN_PRIVATE_KEY =
  process.env.ROPSTEN_PRIVATE_KEY ||
  '5de75329e619948d55744d85d763790ae3f7643f0a498070558acdb37d6b2057'; // Dummy wallet

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

const config = {
  defaultNetwork: 'hardhat',
  solidity: {
    version: '0.6.6',
    optimizer: {enabled: true, runs: 500}
  },
  paths: {
    sources: './contracts',
    tests: './test'
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v5'
  },
  networks: {
    hardhat: {},
    ganache: {
      url: 'http://127.0.0.1:8545',
      mnemonic:
        'lion album emotion suffer october belt uphold mind chronic stool february flag',
      networkId: 3,
      timeout: 0,
      logger: console
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
      accounts: [ROPSTEN_PRIVATE_KEY]
    }
  },
  gasReporter: {
    enabled: COINMARKETCAP_API_KEY ? true : false,
    coinmarketcap: COINMARKETCAP_API_KEY,
    currency: 'GBP',
    src: './contracts'
  }
};

export default config;
