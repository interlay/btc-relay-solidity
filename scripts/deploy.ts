import { ethers } from "@nomiclabs/buidler";
import { TestRelayFactory } from '../typechain/TestRelayFactory'

// const mainnet = {
//     genesis: '0x000040202842774747733a4863b6bbb7b4cfb66baa9287d5ce0d13000000000000000000df550e01d02ee37fce8dd2fbf919a47b8b65684bcb48d4da699078916da2f7decbc7905ebc2013178f58d533',
//     height: 625332,
//     epochStart: '0x6e9d58fb0ab8d0181b1c9e54614f80b64004c2e04da310000000000000000000',
// };
  
const testnet = {
    genesis: '0x0000ff3ffc663e3a0b12b4cc2c05a425bdaf51922ce090acd8fa3a8a180300000000000084080b23fc40476d284da49fedaea9f7cee3aba33a8bad1347fa54740a29f02752b4c45dfcff031a279c2b3a',
    height: 1607272,
    epochStart: '0x84a9ec3b82556297ea36d1377901ecaef0bb5a5cf683f9f05103000000000000'
};

async function main() {
	let signers = await ethers.signers();
  const factory = new TestRelayFactory(signers[0]);
  let contract = await factory.deploy(testnet.genesis, testnet.height);
  console.log(contract.address);
  console.log(await contract.getHashAtHeight(testnet.height));
  await contract.deployed()
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });