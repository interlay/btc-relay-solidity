const {ethers} = require('hardhat');
import {Signer, Wallet} from 'ethers';
import chai from 'chai';
import {deployContract, solidity} from 'ethereum-waffle';
import Artifact from '../artifacts/contracts/ParserDelegate.sol/ParserDelegate.json';
import {ParserDelegate} from '../typechain/ParserDelegate';

chai.use(solidity);
const {expect} = chai;

function btcToSat(btc: number): number {
  return btc * Math.pow(10, 8);
}

describe('Parser', () => {
  let signers: Signer[];
  let parser: ParserDelegate;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    parser = (await deployContract(
      signers[0] as Wallet,
      Artifact,
      []
    )) as ParserDelegate;
  });

  const rawTx1 =
    '0x0200000000010111b6e0460bb810b05744f8d38262f95fbab02b168b070598a6f31fad' +
    '438fced4000000001716001427c106013c0042da165c082b3870c31fb3ab4683feffffff' +
    '0200ca9a3b0000000017a914d8b6fcc85a383261df05423ddf068a8987bf0287873067a3' +
    'fa0100000017a914d5df0b9ca6c0e1ba60a9ff29359d2600d9c6659d870247304402203b' +
    '85cb05b43cc68df72e2e54c6cb508aa324a5de0c53f1bbfe997cbd7509774d022041e1b1' +
    '823bdaddcd6581d7cde6e6a4c4dbef483e42e59e04dbacbaf537c3e3e8012103fbbdb3b3' +
    'fc3abbbd983b20a557445fb041d6f21cc5977d2121971cb1ce5298978c000000';

  it('should parse first output value', async () => {
    const result = await parser.extractOutputValueAtIndex(rawTx1, 0);
    expect(result.toNumber()).to.eq(1000000000);
  });

  it('should parse first output script', async () => {
    const result = await parser.extractOutputScriptAtIndex(rawTx1, 0);
    expect(result).to.eq('0xa914d8b6fcc85a383261df05423ddf068a8987bf028787');
  });

  const rawTx2 =
    '0x02000000000101b3cc334a386bd6318934ebff35914b9276835ccb1b9d85400de90613bc34e9430b00000000fdffffff02002d3101000000001600145587090c3288b46df8cc928c6910a8c1bbea508f94839d02000000001600145d0dd54e7d3457478e54ff5921efc1f099c17e0d0247304402201ed83e8bef81f5770f796b91e3db1741b3248040183905acb6abf2003ff062d9022050f22fcc0af72a91a358346b579078e535b4512587d876ad91f84b6849ac23ca0121025b5424e82f8c4313f6ec880724aab8cd78ed059b3115fd5075b63b3c3524134b02ab1a00';

  it('should parse and verify', async () => {
    const result = await parser.extractOutputValueAtIndex(rawTx2, 0);
    expect(result.toNumber()).to.eq(btcToSat(0.2));
  });

  // d9c9213136854a53211f1c80d202b743dfe971867558fd2c5628fe781a7f7ba9
  const p2pkhTx =
    '0x0200000001f76fec5260faa8f39fbd8f17f5acb2bd50260fa715347201657fceaefc14a102' +
    '000000006a47304402203f09be3d47d77f6a0948023aa80dc849128ce5a9cb017ed3c2413abb' +
    '74accf9c022019da8fed912a6b5b01aa6088fee3bdeb0d237d37072e29fb7b238932bf140cd0' +
    '012103785122f4493e03a7082398099e8f159a293ba496344c1c9b673074b1318ee336feffff' +
    'ff02acfad806000000001976a914679775af720fa9bf3602150ee699ad7e2a24d96888ac4e90' +
    'b76e200000001976a914e5ea7e9aae7df252796864912f0df41b4b956f4488ace3c01300';

  it('should successfully extract p2pkh output', async () => {
    const result = await parser.extractOutputValueAtIndex(p2pkhTx, 1);
    expect(result.toNumber()).to.eq(139296477262);
  });

  const p2wpkhTx =
    '0x01000000000101747c038ceb0a5ab9edd61d39f3d3c611cd52ccd0f519d9ad93ccf1f81a0f' +
    'c5d30100000000ffffffff026400000000000000160014867a55207369ad0fe47cf3cfd2ecba' +
    'ef2446c8b40000000000000000226a2000000000000000000000000000000000000000000000' +
    '0000000000000000000002473044022049a2913d41700d3076cec041d1d0906fe59c6d384c4a' +
    'c4e67dc2b9bdc121f300022045a0c6edb241c39b2578bc9c2cb60e60821f18e273da799010bc' +
    'c2a47c3d7e4e01210290465bd783baaa9d52df3b57e31cef7df72c0cbd10afe6a10e3cfbd947' +
    '7c8acf00000000';

  it('should successfully extract p2wpkh output', async () => {
    const result = await parser.extractOutputScriptAtIndex(p2wpkhTx, 1);
    console.log(result);
  });
});
