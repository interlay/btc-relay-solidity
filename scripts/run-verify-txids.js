const { benchmark, writeFile } = require('./helpers')
const assert = require('assert')

const txIds = require('../test/testdata/sample-tx-ids.json')

async function execute (txChecker, inputCount) {
  const ids = txIds.slice(0, inputCount)
  assert.ok(await txChecker.idsExist.call(ids))
  const result = await txChecker.idsExist(ids)
  return {
    inputCount,
    txHash: result.tx,
    gasUsed: result.receipt.gasUsed
  }
}

async function run () {
  const TxChecker = artifacts.require('TxChecker')
  const txChecker = await TxChecker.deployed()

  const results = await benchmark(txChecker, execute)
  const outputFile = 'results/verify-txids.json'
  await writeFile(outputFile, JSON.stringify(results), 'utf8')
}

module.exports = function (callback) {
  run().then(callback).catch(callback)
}
