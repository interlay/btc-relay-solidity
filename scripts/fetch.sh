#!/bin/bash

# https://github.com/Blockstream/esplora

## Transaction

TXID=9f0370848f7bbf67908808997661a320af4f0075dce313e2934a576ed8204059

echo -e "\nTx Proof:"
curl -S https://blockstream.info/api/tx/${TXID}/merkle-proof --output -

echo -e "\n\nTx Hex:"
curl -S https://blockstream.info/api/tx/${TXID}/hex --output -

## Block

HASH=000000000000000000059fc83a88cbbe1532e40edaf95fb0eb5fb76257977ff7

echo -e "\n\nBlock Info:"
curl -sS https://blockstream.info/api/block/${HASH} --output -

echo -e "\n\nBlock Header:"
curl -sS https://blockstream.info/api/block/${HASH}/raw --output - | tac | tac | xxd -p | tr -d \\n | head -c 160