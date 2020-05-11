const fs = require('fs')
let { exec } = require('child_process')
const { promisify } = require('util')

exec = promisify(exec)

const BCGEN = process.env.BCGEN || 'bcgen'
const INCLUDE_WITNESS = exports.INCLUDE_WITNESS = stringToBool(process.env.INCLUDE_WITNESS || 'false')

function stringToBool (string) {
  if (['false', '0', 'no'].includes(string)) {
    return false
  } else {
    return true
  }
}

exports.generateTransaction = async function (inputCount) {
  let command = `${BCGEN} generate-tx -m ${inputCount}`
  if (!INCLUDE_WITNESS) {
    command += ' --no-witness'
  }

  const bcgenResult = await exec(command)
  return '0x' + bcgenResult.stdout
}

exports.writeFile = promisify(fs.writeFile)

exports.benchmark = async function (contract, execute, options) {
  options = Object.assign({ start: 1, end: 50 }, options)
  const results = []

  for (let i = options.start; i <= options.end; i++) {
    try {
      console.error(`progress: ${i}/${options.end}`)
      const result = await execute(contract, i)
      results.push(result)
    } catch (err) {
      console.error(`failed with count = ${i}: ${err}`)
    }
  }
  return results
}
