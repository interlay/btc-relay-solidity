import config from "../buidler.config";
import  * as child from "child_process";

var ganache_cmd = "ganache-cli -d";
var port = "-p 8545";
var mnemonic = "-m ".concat(config.networks.ganache.mnemonic);
var id = "-i ".concat(config.networks.ganache.network_id.toString());

console.log(ganache_cmd.concat(" ", port, " ", mnemonic, " ", id));

var ganache: child.ChildProcess = child.spawn("ganache-cli", [port, mnemonic, id]);

ganache.stdout!.on('data', (data) => {
    console.log(data.toString());
});
ganache.stderr!.on('data', (data) => {
    console.log(data.toString());
});
ganache.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
