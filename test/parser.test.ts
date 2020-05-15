import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import Artifact from "../artifacts/ParserDelegate.json";
import { ParserDelegate } from "../typechain/ParserDelegate"

chai.use(solidity);
const { expect } = chai;

describe("Parser", () => {
  let signers: Signer[];
  let parser: ParserDelegate;

  beforeEach(async () => {
    signers = await ethers.signers();
    parser = await deployContract(<Wallet>signers[0], Artifact, []) as ParserDelegate;
  });
  
  let tx = "0x0200000000010111b6e0460bb810b05744f8d38262f95fbab02b168b070598a6f31fad" +
           "438fced4000000001716001427c106013c0042da165c082b3870c31fb3ab4683feffffff" +
           "0200ca9a3b0000000017a914d8b6fcc85a383261df05423ddf068a8987bf0287873067a3" +
           "fa0100000017a914d5df0b9ca6c0e1ba60a9ff29359d2600d9c6659d870247304402203b" +
           "85cb05b43cc68df72e2e54c6cb508aa324a5de0c53f1bbfe997cbd7509774d022041e1b1" +
           "823bdaddcd6581d7cde6e6a4c4dbef483e42e59e04dbacbaf537c3e3e8012103fbbdb3b3" +
           "fc3abbbd983b20a557445fb041d6f21cc5977d2121971cb1ce5298978c000000";

  it("should parse first output value", async () => {
    let result = await parser.extractOutputValueAtIndex(tx, 0);
    expect(result.toNumber()).to.eq(1000000000);
  });

  it("should parse first output script", async () => {
    let result = await parser.extractOutputScriptAtIndex(tx, 0);
    expect(result).to.eq("0xa914d8b6fcc85a383261df05423ddf068a8987bf028787");
  });

});