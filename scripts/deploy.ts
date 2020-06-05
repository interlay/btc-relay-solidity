import { ethers } from "@nomiclabs/buidler";
import { TestRelayFactory } from '../typechain/TestRelayFactory'

type Genesis = {
  header: string,
  height: number,
}

// const mainnet: Genesis = {
//     header: '0x000040202842774747733a4863b6bbb7b4cfb66baa9287d5ce0d13000000000000000000df550e01d02ee37fce8dd2fbf919a47b8b65684bcb48d4da699078916da2f7decbc7905ebc2013178f58d533',
//     height: 625332,
// };
  
const testnet: Genesis = {
    header: '0x0000002052ee0268400be3acb86eb36901b25729a7170f70d7d34adf60cb4e2200000000212a63e6c467ccc5a5dcbcf890fc0167fe5c7b8040a0adf71ea40dccd6d6cdc0ea16d95effff001d98dc7aac',
    height: 1747713,
};

// const regtest: Genesis = {
//   header: '0x0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f2002000000',
//   height: 0,
// }

async function main(start: Genesis) {
	let signers = await ethers.signers();
  const factory = new TestRelayFactory(signers[0]);
  let contract = await factory.deploy(start.header, start.height);
  console.log(`Genesis height: ${start.height}`);
  console.log(`Contract address: ${contract.address}`);
  // console.log(await contract.getHashAtHeight(start.height));
  await contract.deployed();
}

main(testnet)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });