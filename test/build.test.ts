const { ethers } = require("hardhat");
import chai from 'chai';
import {solidity} from 'ethereum-waffle';
import {genesis, generate} from '../scripts/builder';
import {DeployTestRelay} from '../scripts/contracts';

chai.use(solidity);
const {expect} = chai;

describe('Build', () => {
  it('should build and store headers', async () => {
    let block = genesis();
    const signers = await ethers.getSigners();
    const contract = await DeployTestRelay(signers[0], {
      header: '0x' + block.toHex(true),
      height: 1
    });

    block = generate(
      'bcrt1qu96jmjrfgpdynvqvljgszzm9vtzp7czquzcu6q',
      block.getHash()
    );
    await contract.submitBlockHeader('0x' + block.toHex(true));
    let best = await contract.getBestBlock();
    expect(best.digest).to.eq(
      '0x9588627a4b509674b5ed7180cb2f9c8679fe5f1c8a6378069af0f2b8c2ff831f'
    );

    block = generate(
      'bcrt1qu96jmjrfgpdynvqvljgszzm9vtzp7czquzcu6q',
      block.getHash()
    );
    await contract.submitBlockHeader('0x' + block.toHex(true));
    best = await contract.getBestBlock();
    expect(best.digest).to.eq(
      '0x7b02735fdcd34c70e65d1442949bd0a0fae69aedabfc05503f3ae5998a8f4348'
    );
  });
});
