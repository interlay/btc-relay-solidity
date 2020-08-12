/* eslint-disable no-console */

import {ethers} from '@nomiclabs/buidler';
import {Genesis, DeployTestRelay, Call} from './contracts';
import {TestRelay} from '../typechain/TestRelay';

const testnet: Genesis = {
  header:
    '0x00e0ff2ffb2b253e060112bed62614fcf9ae61f82c08d9e6c36a1b53070000000000000003b91283ae15b75dc2023735356f1412411d07ece715f3ed0e612ab4349b7db83030eb5ef2a5011add0c8e82',
  height: 1772070
};

const header1 =
  '0x00e0ff2ff52256c9e5df9e6e39024ee23ce2604a6b32bb7ad4733bcff6000000000000005fcc9125f16b4ae49bf506be9443aeeb2c552fd31b38278d443cb2900a9d62d02631eb5ef2a5011adc56d881';
const header2 =
  '0x00e0ff37df39f4cf01c11b5293b63253e72d72c6bf03c9c67c7f206d47010000000000000d8fd592ed0cb0eff8ba97654518535ded4ac65e60d8caff0f7f4c92318675343533eb5ef2a5011a63ca05a4';
const header3 =
  '0x00e0ff379e7c88a954ff65b100f769b3cc939f6290f39a535ea20e54b400000000000000a1158216c4706c03fa2d32d5ed3bfa37ec88e3531f5038daf3a65cae1650a7ae3f33eb5ef2a5011a423e3ce6';
const header4 =
  '0x00000020bc326e72bfe82dbb3bef4ce02c504c7b7a3e9e01c23942099700000000000000191210b151a77f1a304712f7ad0d032b3f273b78fa4845f64b4f5c132c9329f62534eb5ef2a5011a8248a3e2';
const header5 =
  '0x00e0ff37a8d07739c1ed5596bfdac945d573dc0b9877ceba67d85d509a00000000000000d1944ac1b4c9cf39fcb65846b1fd964e73d3f6efdcfc10f9ff86c7a2d36f2c780436eb5ef2a5011aaa0bcd2e';
const header6 =
  '0x000000206589831ee7a19099e0cac44e81c00e4cec2ffdbd11b8daa6a101000000000000cb015e7ea21600b6ea3d08bbdc248de9f09d033b80486d52628764ecb58676550037eb5ef2a5011a12fdc910';

const tx = {
  id: '0x2aa1c99122795b13627a19e8d1c797f732d73192449dbb78070cd6dd8f2c5873',
  index: 26,
  proof:
    '0x80aa78579fcc3acaaa9f7ded3d79219994ab5d678cb2d3174a74e512e1bce312769d180c1dd9de52f2a346784eebb8d79dce4a7bc6e8f99a0fb86e031f12fda63c4c00554bbffbff036d7801d5b12e60797c7a7fffbd6e96631173862542beee5ded8c7972616fb41634adbfcffcb84f79ab4bd86b4b62e7c6e628bc4cbee782ef42b28c8bfae0d52680845f8109ffd0f869424e9e1d93f06a19ec53370ac349e91d43d22f5e989501bb73bb764369ff5f8c0299c80d9a771f227972de4e8233a9461039a44cae80048f60aaad19427a2dae896f619c302e412ebbd3e37f8503',
  header:
    '0x00e0ff2ffb2b253e060112bed62614fcf9ae61f82c08d9e6c36a1b53070000000000000003b91283ae15b75dc2023735356f1412411d07ece715f3ed0e612ab4349b7db83030eb5ef2a5011add0c8e82',
  headerHash:
    '0x00000000000000f6cf3b73d47abb326b4a60e23ce24e02396e9edfe5c95622f5',
  height: 1772070
};

async function submitHeader(relay: TestRelay, header: string): Promise<void> {
  const transaction = await relay.submitBlockHeader(header);
  const receipt = await transaction.wait(0);
  console.log(`Gas [Header]: ${receipt.gasUsed?.toString()}`);
}

// async function submitHeaderBatch(
//   relay: TestRelay,
//   ...headers: string[]
// ): Promise<void> {
//   let batch =
//     '0x' +
//     headers
//       .map((header) => {
//         return header.substr(2);
//       })
//       .join('');
//   let transaction = await relay.submitBlockHeaderBatch(batch);
//   let receipt = await transaction.wait(0);
//   console.log(`Gas [Header - Batch]: ${receipt.gasUsed?.toString()}`);
// }

async function main(genesis: Genesis): Promise<void> {
  const signers = await ethers.signers();
  const contract = await DeployTestRelay(signers[0], genesis);
  let receipt = await contract.deployTransaction.wait(0);
  console.log(`Gas [Deploy]: ${receipt.gasUsed?.toString()}`);

  // await submitHeaderBatch(contract, header1, header2, header3, header4, header5, header6);
  await submitHeader(contract, header1);
  await submitHeader(contract, header2);
  await submitHeader(contract, header3);
  await submitHeader(contract, header4);
  await submitHeader(contract, header5);
  await submitHeader(contract, header6);

  receipt = await Call(
    signers[0],
    contract,
    contract.interface.functions.verifyTx,
    [tx.height, tx.index, tx.id, tx.header, tx.proof, 0, false]
  );
  console.log(`Gas [Verify]: ${receipt.gasUsed?.toString()}`);
}

main(testnet)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
