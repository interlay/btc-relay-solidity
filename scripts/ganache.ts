/* eslint-disable no-console */

import config from '../hardhat.config';
import * as child from 'child_process';

const ganacheCmd = 'ganache-cli -d';
const port = '-p 8545';
const mnemonic = '-m '.concat(config.networks.ganache.mnemonic);
const id = '-i '.concat(config.networks.ganache.networkId.toString());

console.log(ganacheCmd.concat(' ', port, ' ', mnemonic, ' ', id));

const ganache: child.ChildProcess = child.spawn('ganache-cli', [
  port,
  mnemonic,
  id
]);

ganache.stdout!.on('data', (data) => {
  console.log(data.toString());
});
ganache.stderr!.on('data', (data) => {
  console.log(data.toString());
});
ganache.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
