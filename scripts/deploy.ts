/* eslint-disable no-console */

import {ethers} from '@nomiclabs/buidler';
import {DeployTestRelay, Genesis} from './contracts';

// const mainnet: Genesis = {
//     header: '0x000040202842774747733a4863b6bbb7b4cfb66baa9287d5ce0d13000000000000000000df550e01d02ee37fce8dd2fbf919a47b8b65684bcb48d4da699078916da2f7decbc7905ebc2013178f58d533',
//     height: 625332,
// };

const testnet: Genesis = {
  header:
    '0x000000205bfc6e486b03fb85dcd97eb7653b4e97ae7b1a5e38c8062fd2020000000000003b9e75208084a693ee47db4a0accd4bfcc645214f936a72128368585bed2a79c9f2c2d5ffcff031aa4583329',
  height: 1805421
};

// const regtest: Genesis = {
//   header: '0x0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f2002000000',
//   height: 0,
// }

async function main(genesis: Genesis): Promise<void> {
  const signers = await ethers.signers();
  const contract = await DeployTestRelay(signers[0], genesis);
  console.log(`Genesis height: ${genesis.height}`);
  console.log(`Contract address: ${contract.address}`);
  // console.log(await contract.getHashAtHeight(start.height));
}

main(testnet)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
