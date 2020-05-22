import { BuidlerConfig, usePlugin } from "@nomiclabs/buidler/config";

usePlugin("@nomiclabs/buidler-ganache");
usePlugin("@nomiclabs/buidler-waffle");
usePlugin("buidler-typechain");

const config /*: BuidlerConfig*/ = {
  defaultNetwork: "buidlerevm",
  solc: {
    version: "0.5.15",
    optimizer: { enabled: true, runs: 200 }
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
        // fork: 'https://ropsten.infura.io/v3/${ INFURA_ID }',
        mnemonic: 'lion album emotion suffer october belt uphold mind chronic stool february flag',
        network_id: 3,
        timeout: 0,
        logger: console,
      },
  },
};

export default config;