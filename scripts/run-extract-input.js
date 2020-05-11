const assert = require('assert')
const { writeFile, generateTransaction, benchmark, INCLUDE_WITNESS } = require('./helpers')

async function execute (relay, inputCount) {
  const rawTransaction = await generateTransaction(inputCount)
  const output = await relay.extractInputTxids.call(rawTransaction)
  const computedInputCount = output.substring(2).length / 64
  assert.equal(computedInputCount, inputCount)
  const result = await relay.extractInputTxids(rawTransaction)
  return {
    inputCount,
    gasUsed: result.receipt.gasUsed
  }
}

async function run () {
  const Relay = artifacts.require('BTCRelay')
  const relay = await Relay.deployed()
  const prep = INCLUDE_WITNESS ? 'with' : 'without'
  const outputFile = `results/extract-input-${prep}-witness.json`
  const results = await benchmark(relay, execute)
  await writeFile(outputFile, JSON.stringify(results), 'utf8')
}

module.exports = function (callback) {
  run().then(callback).catch(callback)
}
