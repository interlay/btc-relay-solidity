import { usePlugin } from "@nomiclabs/buidler/config";

usePlugin("@nomiclabs/buidler-ganache");
usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-typechain");
usePlugin('buidler-gas-reporter');

const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
const ROPSTEN_PRIVATE_KEY = process.env.ROPSTEN_PRIVATE_KEY || '';

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;

const config = {
  defaultNetwork: "buidlerevm",
  solc: {
    version: "0.6.12",
    optimizer: { enabled: true, runs: 500 }
  },
	paths: {
		sources: './src',
		tests: './test',
	},
	typechain: {
    outDir: 'typechain',
    target: 'ethers'
  },
  networks: {
      buidlerevm : {},
      ganache: {
        url: 'http://127.0.0.1:8545',
        mnemonic: 'lion album emotion suffer october belt uphold mind chronic stool february flag',
        network_id: 3,
        timeout: 0,
        logger: console,
      },
      ropsten: {
        url: `https://ropsten.infura.io/v3/${INFURA_API_KEY}`,
        accounts: [ROPSTEN_PRIVATE_KEY]
      },
  },
  gasReporter: {
    enabled: (COINMARKETCAP_API_KEY ? true : false),
    coinmarketcap: COINMARKETCAP_API_KEY,
    currency: "GBP",
    src: "./src"
  },
};

export default config;