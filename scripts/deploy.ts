import { ethers } from "@nomiclabs/buidler";
import { DeployTestRelay, Genesis } from "./contracts";

// const mainnet: Genesis = {
//     header: '0x000040202842774747733a4863b6bbb7b4cfb66baa9287d5ce0d13000000000000000000df550e01d02ee37fce8dd2fbf919a47b8b65684bcb48d4da699078916da2f7decbc7905ebc2013178f58d533',
//     height: 625332,
// };
  
const testnet: Genesis = {
    header: '0x00e0ff277984cf5fa52f8e7060933b9082439176ff7168076af7454e1a0200000000000097856e3c31342a2ac164b3bd9e36d181973ccc9e8341b80ab624dc8a00cd2bab61ebea5efcff031a49ed6748',
    height: 1771951,
};

// const regtest: Genesis = {
//   header: '0x0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f2002000000',
//   height: 0,
// }

async function main(genesis: Genesis) {
  let signers = await ethers.signers();
  let contract = await DeployTestRelay(signers[0], genesis);
  console.log(`Genesis height: ${genesis.height}`);
  console.log(`Contract address: ${contract.address}`);
  // console.log(await contract.getHashAtHeight(start.height));
}

main(testnet)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });