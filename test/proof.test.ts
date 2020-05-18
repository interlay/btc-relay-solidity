import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import RelayArtifact from "../artifacts/Relay.json";
import { Relay } from "../typechain/Relay"
import { ErrorCode } from './constants';

chai.use(solidity);
const { expect } = chai;

describe("Proofs", () => {
  let signers: Signer[];
  let relay: Relay;

  let genesisHeader = "0x000000207254b575ca46a64e2251374c8ae42a626d3960662173caff2b181a86b1900677181d48578ffbf3430a24c93afb630c9f727ec6b03fedb96ac5d2135ae5f7245eaeef965dffff7f2001000000";

  beforeEach(async () => {
    signers = await ethers.signers();
  });

  let tx = {
    id: "0x1e55314039d309fbf6af8242021ddff4376272d39b89b23c648c20841397461d",
    proof: "0x1d46971384208c643cb2899bd3726237f4df1d024282aff6fb09d3394031551e",
    index: 0,
  };

  it("should fail with insufficient confirmations", async () => {
    relay = await deployContract(<Wallet>signers[0], RelayArtifact, [genesisHeader, 5]) as Relay;
    expect(await relay.bestHeight()).to.eq(5);

    // checks default stable confirmations
    let result = relay.verifyTx(0, tx.index, tx.id, tx.proof, 0, false);
    expect(result).to.be.revertedWith(ErrorCode.ERR_CONFIRMS);

    // checks custom period
    result = relay.verifyTx(0, tx.index, tx.id, tx.proof, 100, true);
    expect(result).to.be.revertedWith(ErrorCode.ERR_CONFIRMS);
  });

  it("should fail with block not found", async () => {
    relay = await deployContract(<Wallet>signers[0], RelayArtifact, [genesisHeader, 100]) as Relay;
    expect(await relay.bestHeight()).to.eq(100);

    // checks default stable confirmations
    let result = relay.verifyTx(0, tx.index, tx.id, tx.proof, 0, false);
    expect(result).to.be.revertedWith(ErrorCode.ERR_VERIFY_TX);
  });
});