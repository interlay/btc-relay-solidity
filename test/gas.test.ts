import {ethers} from '@nomiclabs/buidler';
import {Signer, Wallet} from 'ethers';
import chai from 'chai';
import {deployContract, solidity} from 'ethereum-waffle';
import RelayArtifact from '../artifacts/Relay.json';
import {Relay} from '../typechain/Relay';

chai.use(solidity);
const {expect} = chai;

describe('Gas', () => {
  let signers: Signer[];
  let relay: Relay;

  const genesisHeader =
    '0x00000020db62962b5989325f30f357762ae456b2ec340432278e14000000000000000000d1dd4e30908c361dfeabfb1e560281c1a270bde3c8719dbda7c848005317594440bf615c886f2e17bd6b082d';
  // const genesisHash =
  //   '0x4615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000';
  const genesisHeight = 562621;

  // 562622
  const header1 =
    '0x000000204615614beedb06491a82e78b38eb6650e29116cc9cce21000000000000000000b034884fc285ff1acc861af67be0d87f5a610daa459d75a58503a01febcc287a34c0615c886f2e17046e7325';

  it('should cost less than amount', async () => {
    signers = await ethers.signers();
    relay = (await deployContract(signers[0] as Wallet, RelayArtifact, [
      genesisHeader,
      genesisHeight
    ])) as Relay;
    const deployCost = (
      await relay.deployTransaction.wait(1)
    ).gasUsed?.toNumber();
    // console.log(`Deploy: ${deployCost}`);
    expect(deployCost).to.be.lt(2_300_000);

    const result = await relay.submitBlockHeader(header1);
    const updateCost = (await result.wait(1)).gasUsed?.toNumber();
    // console.log(`Update: ${updateCost}`);
    expect(updateCost).to.be.lt(120_000);
  });
});
