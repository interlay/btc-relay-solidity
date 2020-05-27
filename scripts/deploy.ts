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
    header: '0x00000020135cbbf7f95c610be49a8269119650071d65804b74bb406d329c703600000000b097e85bbb9d6f138366eb181c94f458f9ff1db60a4c11dc9b6fa407327c7161d36eca5effff001d231b3547',
    height: 1746433,
};

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