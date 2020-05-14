import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import RelayArtifact from "../artifacts/Relay.json";
import { Relay } from "../typechain/Relay"

chai.use(solidity);
const { expect } = chai;

describe("Relay", () => {
  let signers: Signer[];
  let relay: Relay;

  beforeEach(async () => {
    signers = await ethers.signers();
    let genesis = "0x00000020db62962b5989325f30f357762ae456b2ec340432278e14000000000000000000d1dd4e30908c361dfeabfb1e560281c1a270bde3c8719dbda7c848005317594440bf615c886f2e17bd6b082d";
    let height = 2354;

    relay = await deployContract(<Wallet>signers[0], RelayArtifact, [genesis, height]) as Relay;

    let filter = relay.filters.StoreHeader("0x4615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000", height);
    await new Promise((resolve, reject) => {
      relay.once(filter, () => {
        // event emitted
        resolve()
      })  
    })
  });

  describe("Basic", async () => {
    it("genesis header should be stored", async () => {

      // TODO: check event

      // check header was stored correctly
      let hash = "0x4615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000";
      const header = await relay.getBlockHeader(hash);
      expect(header.height).to.eq(2354);
      // assert.equal(storedHeader.blockHeight.toNumber(), genesis.height);
      // assert.equal(flipBytes(storedHeader.merkleRoot), genesis.merkleroot);
      // console.log("Gas used: " + submitHeaderTx.receipt.gasUsed);

    });
  });
});