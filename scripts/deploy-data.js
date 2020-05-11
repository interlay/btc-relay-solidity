const blocks = require('../test/testdata/blocks.json')

function storeGenesis (relay) {
  const genesis = blocks[0]
  return relay.setInitialParent(genesis.header, genesis.height)
}

async function storeBlocks (relay) {
  for (const block of blocks.slice(1)) {
    await relay.storeBlockHeader(block.header)
  }
}

async function run () {
  const Relay = artifacts.require('BTCRelay')
  const relay = await Relay.deployed()
  await storeGenesis(relay)
  await storeBlocks(relay)
}

module.exports = function (callback) {
  run().then(callback).catch(callback)
}
