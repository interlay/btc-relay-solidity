var BTCRelay = artifacts.require("./BTCRelay.sol");
var Utils = artifacts.require("./Utils.sol")

module.exports = function (deployer, network) {
    if (network == "development") {
        deployer.deploy(Utils);
        deployer.link(Utils, BTCRelay);
        deployer.deploy(BTCRelay);
    } else if (network == "ropsten") {
        deployer.deploy(BTCRelay);
    } else if (network == "main") {
        deployer.deploy(BTCRelay);
    }
};
