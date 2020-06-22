import { Signer } from "ethers";
import { TestRelayFactory } from '../typechain/TestRelayFactory'
import { RelayFactory } from '../typechain/RelayFactory'

export type Genesis = {
  header: string,
  height: number,
}

export async function DeployRelay(signer: Signer, genesis: Genesis) {
    const factory = new RelayFactory(signer);
    let contract = await factory.deploy(genesis.header, genesis.height);
    return contract.deployed();
}

export async function DeployTestRelay(signer: Signer, genesis: Genesis) {
    const factory = new TestRelayFactory(signer);
    let contract = await factory.deploy(genesis.header, genesis.height);
    return contract.deployed();
}