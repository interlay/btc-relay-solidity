#!/bin/bash

# https://github.com/Blockstream/esplora

## Transaction

TXID=9f0370848f7bbf67908808997661a320af4f0075dce313e2934a576ed8204059

curl https://blockstream.info/api/tx/${TXID}/merkle-proof --output -
curl https://blockstream.info/api/tx/${TXID}/hex --output -

## Block

HASH=00000000000000000021868c2cefc52a480d173c849412fe81c4e5ab806f94ab

curl https://blockstream.info/api/block/${HASH} --output -
curl https://blockstream.info/api/block/${HASH}/raw --output - | tac | tac | xxd -p | tr -d \\n | head -c 160