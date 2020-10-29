const { ethers } = require("hardhat");
import {Signer, Wallet} from 'ethers';
import chai from 'chai';
import {deployContract, solidity} from 'ethereum-waffle';
import RelayArtifact from '../artifacts/contracts/Relay.sol/Relay.json';
import {Relay} from '../typechain/Relay';

chai.use(solidity);
const {expect} = chai;

async function getBestBlockDigest(relay: Relay): Promise<string> {
  const {digest} = await relay.getBestBlock();
  return digest;
}

describe('Forking', () => {
  let signers: Signer[];
  let relay: Relay;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    const genesis =
      '0x00000020db62962b5989325f30f357762ae456b2ec340432278e14000000000000000000d1dd4e30908c361dfeabfb1e560281c1a270bde3c8719dbda7c848005317594440bf615c886f2e17bd6b082d';
    relay = (await deployContract(signers[0] as Wallet, RelayArtifact, [
      genesis,
      562621
    ])) as Relay;
  });

  it('should reorg to longer chain', async () => {
    // submit main chain
    await relay.submitBlockHeader(
      '0x000000204615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000b034884fc285ff1acc861af67be0d87f5a610daa459d75a58503a01febcc287a34c0615c886f2e17046e7325'
    ); // 562622
    await relay.submitBlockHeader(
      '0x00000020b8b580a399f4b15078b28c0d0bba705a6894833b8a490f000000000000000000b16c32aa36d3b70749e7febbb9e733321530cc9a390ccb62dfb78e3955859d4c44c0615c886f2e1744ea7cc4'
    ); // 562623
    await relay.submitBlockHeader(
      '0x00000020f549a985f656ab3416afa5734917d8bb7339829e536620000000000000000000af9c9fe22494c39cf382b5c8dcef91f079ad84cb9838387aaa17948fbf25753430c2615c886f2e170a654758'
    ); // 562624
    await relay.submitBlockHeader(
      '0x00e0ff3f8bfff9ae28af2aa90adfdb92b218829727886488dcc914000000000000000000e78265c12495ef469b3e85aa570667fdcb5bf534304fcbe4621c706d0e7ca8149dc3615c886f2e171c3fa2b8'
    ); // 562625
    await relay.submitBlockHeader(
      '0x00000020fee20039fe494f7408c090e03970ec9b132366066f380d0000000000000000006f510b84a156d42cb64f30b97a7fc6dd030c9b77e19bbcd850c9f3c69bc533dacec3615c886f2e170a1a921d'
    ); // 562626
    await relay.submitBlockHeader(
      '0x00000020d2406bb15e4f917104d2b2d9320454b947fb08a723301d0000000000000000006aa31402bb974ebcd45eb2b0be7df8cc48ea9721493978e8715ce93b55d5ea20d1c5615c886f2e1767973d73'
    ); // 562627
    await relay.submitBlockHeader(
      '0x00e0002096f25d34d30a1bf4e280d6bb38b228e8993c8b28222d2b0000000000000000002488333a3bab6cc72d04ee1523ae83c9559938bef8521cb624c9641bb58cabe953ce615c886f2e172e0885ce'
    ); // 562628
    await relay.submitBlockHeader(
      '0x00000020b86918706260609b3b6aaf684aed961eac6b015e637024000000000000000000e72e0a6fd324d36edee39f9336c56f129f1ef7c2ec26d0dfb01e4520fb7a8d7fcdce615c886f2e17415cdb46'
    ); // 562629

    const oldBestBlock =
      '0x5204b3afd5c0dc010de8eeb28925b97d4b38a16b1d020f000000000000000000';

    // submit orphan
    await relay.submitBlockHeader(
      '0x0000802020ffe4f7a005faa83610adf7e7a52ff5700c222b9b5f0500000000000000000058c8af6bf8e8e00c3d6ff512b2133533ebdcde164de306e6b65e53157fc22b53e7d3615c886f2e17ed205930'
    ); // 562630
    expect(await getBestBlockDigest(relay)).to.eq(oldBestBlock);

    // submit fork
    await relay.submitBlockHeader(
      '0x0000002020ffe4f7a005faa83610adf7e7a52ff5700c222b9b5f050000000000000000009d1479517fda612a10a279b2339952bbdba8fe47c8fec644921d146ec79482ecebd3615c886f2e179234c38e'
    ); // 562630
    expect(await getBestBlockDigest(relay)).to.eq(oldBestBlock);

    // extend fork
    await relay.submitBlockHeader(
      '0x0000002051214b0c42383a1ea7bf28f20062f81d7b72497cb1030a00000000000000000000af444756eb5313dae6cb8dc7b4e00ae7d79cfa67a85b4b486a9583896ab3314bd8615c886f2e17f152bc1f'
    ); // 562631
    expect(await getBestBlockDigest(relay)).to.eq(oldBestBlock);
    await relay.submitBlockHeader(
      '0x00e00020bf01515ce1f4f971b9805205373093c200b2bf92d56408000000000000000000b2c2fcb555d6e2d677bb9919cc2d9660c81879225d15f53f679e3fdbfad129d032db615c886f2e17155f22df'
    ); // 562632
    expect(await getBestBlockDigest(relay)).to.eq(oldBestBlock);
    await relay.submitBlockHeader(
      '0x00000020a4c292016c1585e6f81986f7e216c79d28b15b1d513a100000000000000000004e33f75c5f63371d4a05e7ab93afb7c1caa22d2f9d4fce61e194ab8ffe741f35c0de615c886f2e17032ddf4b'
    ); // 562633
    expect(await getBestBlockDigest(relay)).to.eq(oldBestBlock);
    await relay.submitBlockHeader(
      '0x00000020577d11b45f90733748343b5add65dbe88216fa3027cc20000000000000000000ef200d52b09ae1902d62476f09405e21fa81cd7972ccfeaf37b47b00ef4e2180cdde615c886f2e171f2b5f80'
    ); // 562634
    expect(await getBestBlockDigest(relay)).to.eq(oldBestBlock);
    await relay.submitBlockHeader(
      '0x00000020f5f2d6840112ff9281bd88f445f135dfb41a64cebeb725000000000000000000a91738fc7b8628e70906164624f80ce54bafe26fe0ef8678f569b0b64e83589cb3e0615c886f2e17c624e58c'
    ); // 562635
    expect(await getBestBlockDigest(relay)).to.eq(oldBestBlock);

    // overtake stable confirmations
    const newBestBlock =
      '0x0ed18ffcb751e45471dddab23d34538869d3b2cdd48428000000000000000000';
    await relay.submitBlockHeader(
      '0x00e00020f98794c5b71e25f07eb2a31ab31b2e2487e0859abec000000000000000000000c29b14f0fe90ac2173197665d460df45c37ccf0c873276f59d095cbed4bcc7c2fae4615c886f2e178a505d9d'
    ); // 562636
    expect(await getBestBlockDigest(relay)).to.eq(newBestBlock);

    const filter = relay.filters.ChainReorg(oldBestBlock, newBestBlock, 1);
    await new Promise((resolve) => {
      relay.once(filter, () => {
        // event emitted
        resolve();
      });
    });
  });
});
