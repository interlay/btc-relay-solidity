import { ethers } from "@nomiclabs/buidler";
import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Relay } from "../typechain/Relay"
import { ErrorCode } from './constants';
import { RelayFactory } from "../typechain/RelayFactory";
import { Arrayish } from "ethers/utils";

chai.use(solidity);
const { expect } = chai;

function deploy(signer: Signer, header: Arrayish, height: number) {
  const factory = new RelayFactory(signer);
  return factory.deploy(header, height);
}

describe("Relay", () => {
  let signers: Signer[];
  let relay: Relay;

  let genesisHeader = "0x00000020db62962b5989325f30f357762ae456b2ec340432278e14000000000000000000d1dd4e30908c361dfeabfb1e560281c1a270bde3c8719dbda7c848005317594440bf615c886f2e17bd6b082d";
  let genesisHash = "0x4615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000";
  let genesisHeight = 562621;

  beforeEach(async () => {
    signers = await ethers.signers();
    relay = await deploy(signers[0], genesisHeader, genesisHeight);
  });

  it("should store genesis header", async () => {
    let filter = relay.filters.StoreHeader(genesisHash, genesisHeight);
    await new Promise((resolve, reject) => {
      relay.once(filter, () => {
        // event emitted
        resolve()
      })  
    })

    // check header was stored correctly
    const height = await relay.getBlockHeight(genesisHash);
    expect(height).to.eq(genesisHeight);
    // expect(header.merkle).to.eq("0xd1dd4e30908c361dfeabfb1e560281c1a270bde3c8719dbda7c8480053175944");
  });

  it("should fail with duplicate (genesis)", async () => {
    let result = relay.submitBlockHeader(genesisHeader);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_DUPLICATE_BLOCK);
  });

  // 562622
  let header1 = "0x000000204615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000b034884fc285ff1acc861af67be0d87f5a610daa459d75a58503a01febcc287a34c0615c886f2e17046e7325";

  it("should store and fail on resubmission", async () => {
    let result = await relay.submitBlockHeader(header1);
    // console.log((await result.wait(1)).gasUsed?.toNumber());

    await expect(relay.submitBlockHeader(header1))
      .to.be.revertedWith(ErrorCode.ERR_DUPLICATE_BLOCK);
  });

  it("should fail with block header > 80", async () => {
    let result = relay.submitBlockHeader(header1 + "123");
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INVALID_HEADER_SIZE);
  });

  it("should fail with block header < 80", async () => {
    let result = relay.submitBlockHeader(header1.substring(0,28));
    await expect(result).to.be.revertedWith(ErrorCode.ERR_INVALID_HEADER_SIZE);
  });

  // 562623
  let header2 = "0x00000020b8b580a399f4b15078b28c0d0bba705a6894833b8a490f000000000000000000b16c32aa36d3b70749e7febbb9e733321530cc9a390ccb62dfb78e3955859d4c44c0615c886f2e1744ea7cc4";

  it("should fail because prev block not stored", async () => {
    let result = relay.submitBlockHeader(header2);
    await expect(result).to.be.revertedWith(ErrorCode.ERR_PREVIOUS_BLOCK);
  });

  // it("should fail with low difficulty", async () => {
  //   let fakeGenesis = {
  //     "hash": "0x00000000000000000012af6694accf510ca4a979824f30f362d387821564ca93",
  //     "height": 597613,
  //     "merkleroot": "0x1c7b7ac77c221e1c0410eca20c002fa7b6467ba966d700868928dae4693b3b78",
  //     "header": "0x00000020614db6ddb63ec3a51555336aed1fa4b86e8cc52e01900e000000000000000000783b3b69e4da28898600d766a97b46b6a72f000ca2ec10041c1e227cc77a7b1c6a43955d240f1617cb069aed"
  //   }
  //   let fakeBlock = {
  //     "hash": "0x000000000000000000050db24a549b7b9dbbc9de1f44cd94e82cc6863b4f4fc0",
  //     "height": 597614,
  //     "merkleroot": "0xc090099a4b0b7245724be6c7d58a64e0bd7718866a5afa81aa3e63ffa8acd69d",
  //     "header" : "0x0000002093ca64158287d362f3304f8279a9a40c51cfac9466af120000000000000000009dd6aca8ff633eaa81fa5a6a861877bde0648ad5c7e64b7245720b4b9a0990c07745955d240f16171c168c88"
  //   }

  //   // await relay.setInitialParent(
  //   // fakeGenesis["header"],
  //   // fakeGenesis["height"]
  //   // );    
  //   // await truffleAssert.reverts(
  //   // relay.storeBlockHeader(
  //   // fakeBlock["header"]
  //   // ),
  //   // constants.ERROR_CODES.ERR_LOW_DIFF
  //   // );

  //   let result = relay.submitBlockHeader(header2);
  //   await expect(result).to.be.revertedWith(ErrorCode.ERR_PREVIOUS_BLOCK);
  // });
});