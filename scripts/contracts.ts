import {Signer, Contract} from 'ethers';
import {TestRelayFactory} from '../typechain/TestRelayFactory';
import {RelayFactory} from '../typechain/RelayFactory';
import {TypedFunctionDescription} from '../typechain';
import {TransactionReceipt} from 'ethers/providers';
import {Relay} from '../typechain/Relay';
import {TestRelay} from '../typechain/TestRelay';

export type Genesis = {
  header: string;
  height: number;
};

export async function DeployRelay(
  signer: Signer,
  genesis: Genesis
): Promise<Relay> {
  const factory = new RelayFactory(signer);
  const contract = await factory.deploy(genesis.header, genesis.height);
  return contract.deployed();
}

export async function DeployTestRelay(
  signer: Signer,
  genesis: Genesis
): Promise<TestRelay> {
  const factory = new TestRelayFactory(signer);
  const contract = await factory.deploy(genesis.header, genesis.height);
  return contract.deployed();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function Call<C extends Contract, T extends any[]>(
  signer: Signer,
  contract: C,
  func: TypedFunctionDescription<{encode: (arg0: T) => string}>,
  args: T
): Promise<TransactionReceipt> {
  const call = contract.interface.functions[func.name].encode(args);
  const response = await signer.sendTransaction({
    to: contract.address,
    data: call
  });
  return response.wait(0);
}
