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
    relay = await deployContract(<Wallet>signers[0], RelayArtifact, [genesis, 562621]) as Relay;
  });

  describe("Fork", async () => {
    it("valid difficulty target", async () => {

      // submit main chain
      await relay.submitBlockHeader("0x000000204615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000b034884fc285ff1acc861af67be0d87f5a610daa459d75a58503a01febcc287a34c0615c886f2e17046e7325"); // 562622
      await relay.submitBlockHeader("0x00000020b8b580a399f4b15078b28c0d0bba705a6894833b8a490f000000000000000000b16c32aa36d3b70749e7febbb9e733321530cc9a390ccb62dfb78e3955859d4c44c0615c886f2e1744ea7cc4"); // 562623
      await relay.submitBlockHeader("0x00000020f549a985f656ab3416afa5734917d8bb7339829e536620000000000000000000af9c9fe22494c39cf382b5c8dcef91f079ad84cb9838387aaa17948fbf25753430c2615c886f2e170a654758"); // 562624
      await relay.submitBlockHeader("0x00e0ff3f8bfff9ae28af2aa90adfdb92b218829727886488dcc914000000000000000000e78265c12495ef469b3e85aa570667fdcb5bf534304fcbe4621c706d0e7ca8149dc3615c886f2e171c3fa2b8"); // 562625
      await relay.submitBlockHeader("0x00000020fee20039fe494f7408c090e03970ec9b132366066f380d0000000000000000006f510b84a156d42cb64f30b97a7fc6dd030c9b77e19bbcd850c9f3c69bc533dacec3615c886f2e170a1a921d"); // 562626
      await relay.submitBlockHeader("0x00000020d2406bb15e4f917104d2b2d9320454b947fb08a723301d0000000000000000006aa31402bb974ebcd45eb2b0be7df8cc48ea9721493978e8715ce93b55d5ea20d1c5615c886f2e1767973d73"); // 562627
      await relay.submitBlockHeader("0x00e0002096f25d34d30a1bf4e280d6bb38b228e8993c8b28222d2b0000000000000000002488333a3bab6cc72d04ee1523ae83c9559938bef8521cb624c9641bb58cabe953ce615c886f2e172e0885ce"); // 562628
      await relay.submitBlockHeader("0x00000020b86918706260609b3b6aaf684aed961eac6b015e637024000000000000000000e72e0a6fd324d36edee39f9336c56f129f1ef7c2ec26d0dfb01e4520fb7a8d7fcdce615c886f2e17415cdb46"); // 562629
      await relay.submitBlockHeader("0x0000002020ffe4f7a005faa83610adf7e7a52ff5700c222b9b5f050000000000000000009d1479517fda612a10a279b2339952bbdba8fe47c8fec644921d146ec79482ecebd3615c886f2e179234c38e"); // 562630

      // submit fork
      await relay.submitBlockHeader("0x0000802020ffe4f7a005faa83610adf7e7a52ff5700c222b9b5f0500000000000000000058c8af6bf8e8e00c3d6ff512b2133533ebdcde164de306e6b65e53157fc22b53e7d3615c886f2e17ed205930"); // 562630
    });
  });
});