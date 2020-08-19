import {ethers} from '@nomiclabs/buidler';
import {Signer, Wallet} from 'ethers';
import chai from 'chai';
import {deployContract, solidity} from 'ethereum-waffle';
import Artifact from '../artifacts/ScriptDelegate.json';
import {ScriptDelegate} from '../typechain/ScriptDelegate';
import * as bech32 from 'bech32';

chai.use(solidity);
const {expect} = chai;

describe('Scripts', () => {
  let signers: Signer[];
  let parser: ScriptDelegate;

  beforeEach(async () => {
    signers = await ethers.signers();
    parser = (await deployContract(
      signers[0] as Wallet,
      Artifact,
      []
    )) as ScriptDelegate;
  });

  it('should accept p2sh script', async () => {
    const result = await parser.isP2SH(
      '0xa914d8b6fcc85a383261df05423ddf068a8987bf028787'
    );
    expect(result).to.be.true;

    const hash = await parser.P2SH(
      '0xa914d8b6fcc85a383261df05423ddf068a8987bf028787'
    );
    expect(hash).to.eq('0xd8b6fcc85a383261df05423ddf068a8987bf0287');
  });

  it('should reject incorrect p2sh script', async () => {
    const result = await parser.isP2SH(
      '0x8814d8b6fcc85a383261df05423ddf068a8987bf028787'
    );
    expect(result).to.be.false;
  });

  it('should accept p2pkh script', async () => {
    const result = await parser.isP2PKH(
      '0x76a91412ab8dc588ca9d5787dde7eb29569da63c3a238c88ac'
    );
    expect(result).to.be.true;

    const hash = await parser.P2PKH(
      '0x76a91412ab8dc588ca9d5787dde7eb29569da63c3a238c88ac'
    );
    expect(hash).to.eq('0x12ab8dc588ca9d5787dde7eb29569da63c3a238c');
  });

  it('should reject incorrect p2pkh script', async () => {
    const result = await parser.isP2PKH(
      '0x88a91412ab8dc588ca9d5787dde7eb29569da63c3a238c88ac'
    );
    expect(result).to.be.false;
  });

  it('should accept cltv script', async () => {
    const result = await parser.isCLTV(
      '0x049f7b2a5cb17576a914371c20fb2e9899338ce5e99908e64fd30b78931388ac'
    );
    expect(result.time).to.eq(1546288031);
    expect(result.addr).to.eq('0x371c20fb2e9899338ce5e99908e64fd30b789313');
  });

  it('should accept p2wpkh script (testnet)', async () => {
    const result = await parser.isP2WPKH(
      '0x00145587090c3288b46df8cc928c6910a8c1bbea508f'
    );
    expect(result).to.be.true;

    const {version, program} = await parser.P2WPKH(
      '0x00145587090c3288b46df8cc928c6910a8c1bbea508f'
    );

    const words = bech32.toWords(Buffer.from(program.substr(2), 'hex'));
    words.unshift(parseInt(version));

    expect(bech32.encode('tb', words)).to.eq(
      'tb1q2krsjrpj3z6xm7xvj2xxjy9gcxa755y0exegh6'
    );
  });

  it('should accept op_return', async () => {
    const result = await parser.isOpReturn(
      '0x6a200000000000000000000000000000000000000000000000000000000000000000'
    );
    expect(result).to.be.true;

    const data = await parser.OpReturn(
      '0x6a200000000000000000000000000000000000000000000000000000000000000000'
    );

    expect(data).to.eq(
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });
});
