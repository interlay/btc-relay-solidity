/* eslint-disable no-console */
// @ts-ignore
import {ethers} from 'hardhat';
import {DeployTestRelay, Genesis} from './contracts';

// const mainnet: Genesis = {
//     header: '0x000040202842774747733a4863b6bbb7b4cfb66baa9287d5ce0d13000000000000000000df550e01d02ee37fce8dd2fbf919a47b8b65684bcb48d4da699078916da2f7decbc7905ebc2013178f58d533',
//     height: 625332,
// };

const testnet: Genesis = {
  header:
    '0x0000002026f83590aa5ae1f3ec4f7b87ee2ef78ea27ca62130b96dc5e1000000000000008d6cbb517c561f53efa451193c692f5d863475be0811f8ec7fa038e5206814af5bb1855fa494021afab33009',
  height: 1862781
};

// const regtest: Genesis = {
//   header: '0x0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f2002000000',
//   height: 0,
// }

async function main(genesis: Genesis): Promise<void> {
  const signers = await ethers.getSigners();
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
