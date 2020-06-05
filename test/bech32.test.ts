import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import Artifact from "../artifacts/Bech32Delegate.json";
import { Bech32Delegate } from "../typechain/Bech32Delegate"

chai.use(solidity);
const { expect } = chai;

describe("Bech32", () => {
  let signers: Signer[];
  let bech32: Bech32Delegate;

  beforeEach(async () => {
    signers = await ethers.signers();
    bech32 = await deployContract(<Wallet>signers[0], Artifact, []) as Bech32Delegate;
  });
  
  let words = [
    18, 31,  7, 28, 14, 25,  2,  2, 31,
    25, 24, 23, 30, 10, 17, 31,  1, 19,
     4, 28,  2, 29, 15, 23, 10, 24, 13,
    22, 12,  6, 12, 23
  ];  

  it("should encode words correctly", async () => {
    let result = await bech32.convert(Buffer.from("97cfc76442fe717f2a3f0cc9c175f7561b661997", 'hex').toJSON().data, 8, 5);
    let data = result.map((out) => {
      return out.toNumber();
    });
    expect(data).to.deep.eq(words);
  });

  it("should compute valid checksum", async () => {
    let result = await bech32.createChecksum(Buffer.from("bc").toJSON().data, [0].concat(words));
    let data = result.map((out) => {
      return out.toNumber();
    });
    expect(data).to.deep.eq([20,21,12,17,13,19]);
  });

  it("should compute valid (partial) address", async () => {
    let result = await bech32.encode(Buffer.from("bc").toJSON().data, [0].concat(words));
    let address = Buffer.from(result.substr(2), 'hex').toString();
    expect(address).to.eq("qjl8uwezzlech723lpnyuza0h2cdkvxvh54v3dn");
  });

  it("should compute valid (partial) address (testnet)", async () => {
    let result = await bech32.convert(Buffer.from("5587090c3288b46df8cc928c6910a8c1bbea508f", 'hex').toJSON().data, 8, 5);
    let data = result.map((out) => {
      return out.toNumber();
    });

    let raw = await bech32.encode(Buffer.from("tb").toJSON().data, [0].concat(data));
    let address = Buffer.from(raw.substr(2), 'hex').toString();
    expect(address).to.eq("q2krsjrpj3z6xm7xvj2xxjy9gcxa755y0exegh6");
  });

  it("should compute and verify address", async () => {
    let result = await bech32.compare(Buffer.from("5587090c3288b46df8cc928c6910a8c1bbea508f", 'hex').toJSON().data, ethers.utils.toUtf8Bytes("tb1q2krsjrpj3z6xm7xvj2xxjy9gcxa755y0exegh6"));
    expect(result).to.be.true;
  });
});