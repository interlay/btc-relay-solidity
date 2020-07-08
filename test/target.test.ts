import { ethers } from "@nomiclabs/buidler";
import { Signer, Wallet } from "ethers";
import chai from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import RelayArtifact from "../artifacts/Relay.json";
import { Relay } from "../typechain/Relay"

chai.use(solidity);
const { expect } = chai;

describe("Retarget", () => {
  let signers: Signer[];
  let relay: Relay;

  beforeEach(async () => {
    signers = await ethers.signers();
    let genesis = "0x000040202842774747733a4863b6bbb7b4cfb66baa9287d5ce0d13000000000000000000df550e01d02ee37fce8dd2fbf919a47b8b65684bcb48d4da699078916da2f7decbc7905ebc2013178f58d533";
    relay = await deployContract(<Wallet>signers[0], RelayArtifact, [genesis, 1]) as Relay;
  });

  it("valid difficulty target", async () => {
    let epoch = {
      start: {
        header: "0x02000000dca825543cefd662b3199e02afa13c6aad4b01890180010400000000000000000187743d481db520170f22701f34a1449384446a55575e2c46e183de28b4854701e690539a855d18b189b5e4",
        target: "0x5d859a000000000000000000000000000000000000000000",
        time: "0x5390e601",
      },
      end: {
        header: "0x0200000075e95a670774b501ff619fdb000f504c0ad29d3f083a27510000000000000000b013371f3c2ee20683a8e492547bb0b87da4b3d8a0ac8ad79bd16ad35f3657853c04a1539a855d182522ac98",
        target: "0x5d859a000000000000000000000000000000000000000000",
        time: "0x53a1043c",
      }
    }

    let next = {
      header: "0x02000000b2b3d204fbd1fda5f1bfa8e83d6f67be7307c05a64d4441b0000000000000000cd19b368ea76f54a604d5c5222d190112f364df1a5af37fbc24cb3fbd32b97642004a153a2ab5118824d1fac",
      target: "0x51aba2000000000000000000000000000000000000000000",
      height: 306432,
    }

    const result = await relay.isCorrectDifficultyTarget(
      epoch.start.target,
      epoch.start.time,
      epoch.end.target,
      epoch.end.time,
      next.target,
    );
    expect(result).to.eq(true);
  });

  it("invalid difficulty target", async () => {
    let epoch = {
      start: {
        header: "0x02000000dca825543cefd662b3199e02afa13c6aad4b01890180010400000000000000000187743d481db520170f22701f34a1449384446a55575e2c46e183de28b4854701e690539a855d18b189b5e4",
        target: "0x5d859a000000000000000000000000000000000000000000",
        time: "0x5390e601",
      },
      end: {
        header: "0x0200000075e95a670774b501ff619fdb000f504c0ad29d3f083a27510000000000000000b013371f3c2ee20683a8e492547bb0b87da4b3d8a0ac8ad79bd16ad35f3657853c04a1539a855d182522ac98",
        target: "0x5d859a000000000000000000000000000000000000000000",
        time: "0x53a1043c",
      }
    }

    let next = {
      header: "0x02000000b2b3d204fbd1fda5f1bfa8e83d6f67be7307c05a64d4441b0000000000000000cd19b368ea76f54a604d5c5222d190112f364df1a5af37fbc24cb3fbd32b97642004a153a2ab5218824d1fac",
      target: "0x52aba2000000000000000000000000000000000000000000",
      height: 306432,
    }

    const result = await relay.isCorrectDifficultyTarget(
      epoch.start.target,
      epoch.start.time,
      epoch.end.target,
      epoch.end.time,
      next.target,
    );
    expect(result).to.eq(false);
  });

  it("invalid period", async () => {
    let epoch = {
      start: {
        header: "0x02000000dca825543cefd662b3199e02afa13c6aad4b01890180010400000000000000000187743d481db520170f22701f34a1449384446a55575e2c46e183de28b4854701e690538a855d18b189b5e4",
        target: "0x5d858a000000000000000000000000000000000000000000",
        time: "0x5390e601",
      },
      end: {
        header: "0x0200000075e95a670774b501ff619fdb000f504c0ad29d3f083a27510000000000000000b013371f3c2ee20683a8e492547bb0b87da4b3d8a0ac8ad79bd16ad35f3657853c04a1539a855d182522ac98",
        target: "0x5d859a000000000000000000000000000000000000000000",
        time: "0x53a1043c",
      }
    }

    let next = {
      header: "0x02000000b2b3d204fbd1fda5f1bfa8e83d6f67be7307c05a64d4441b0000000000000000cd19b368ea76f54a604d5c5222d190112f364df1a5af37fbc24cb3fbd32b97642004a153a2ab5118824d1fac",
      target: "0x51aba2000000000000000000000000000000000000000000",
      height: 306432,
    }

    const result = relay.isCorrectDifficultyTarget(
      epoch.start.target,
      epoch.start.time,
      epoch.end.target,
      epoch.end.time,
      next.target,
    );
    await expect(result).to.be.reverted;
  });
});