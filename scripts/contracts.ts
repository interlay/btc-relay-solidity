import { Signer, Contract } from "ethers";
import { TestRelayFactory } from '../typechain/TestRelayFactory'
import { RelayFactory } from '../typechain/RelayFactory'
import { TypedFunctionDescription } from "../typechain";
import { TransactionReceipt } from "ethers/providers";

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

export async function Call<C extends Contract, T extends any[]>(signer: Signer, contract: C, func: TypedFunctionDescription<{ encode: (arg0: T) => string }>, args: T): Promise<TransactionReceipt> {
  const call = contract.interface.functions[func.name].encode(args);
  const response = await signer.sendTransaction({
    to: contract.address,
    data: call,
  });
  return response.wait(0);
}