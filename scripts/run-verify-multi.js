const assert = require('assert')
const blocks = require('../test/testdata/blocks.json')
const { generateTransaction, writeFile, benchmark } = require('./helpers')

const BLOCK_INDEX = parseInt(process.env.BLOCK_INDEX || '1', 10)
const TX_INDEX = parseInt(process.env.TX_INDEX || '0', 10)

function verifyTransaction (relay, blockIndex, txIndex, options) {
  options = options || {}
  const block = blocks[blockIndex]
  const tx = block.tx[txIndex]
  let baseFunc = relay.verifyTx
  const args = [
    tx.tx_id,
    block.height,
    tx.tx_index,
    tx.merklePath,
    0
  ]
  if (options.multi) {
    args.splice(1, 0, options.rawTx)
    baseFunc = relay.verifyTxMulti
  }
  const func = options.call ? baseFunc.call : baseFunc
  return func.apply(relay, args)
}

async function execute (relay, inputCount) {
  const rawTx = await generateTransaction(inputCount)
  const output = await verifyTransaction(
    relay, BLOCK_INDEX, TX_INDEX, { rawTx, call: true, multi: true })
  // txCount * 32 bytes * 2 (hex encoding) + '0x'
  assert.equal(output.txids.length, inputCount * 64 + 2)
  const resultMulti = await verifyTransaction(relay, BLOCK_INDEX, TX_INDEX, { rawTx, multi: true })
  return {
    inputCount,
    gasUsed: resultMulti.receipt.gasUsed
  }
}

async function run () {
  const Relay = artifacts.require('BTCRelay')
  const relay = await Relay.deployed()

  const resultSingle = await verifyTransaction(relay, BLOCK_INDEX, TX_INDEX)
  const verifyMultiResults = await benchmark(relay, execute)
  const result = {
    blockIndex: BLOCK_INDEX,
    txIndex: TX_INDEX,
    blockTxCount: blocks[BLOCK_INDEX].tx.length,
    verifyTxGasUsed: resultSingle.receipt.gasUsed,
    verifyMultiResults
  }
  const outputFile = `results/benchmark-blk${BLOCK_INDEX}-tx${TX_INDEX}.json`
  await writeFile(outputFile, JSON.stringify(result), 'utf8')
}

module.exports = function (callback) {
  run().then(callback).catch(callback)
}
