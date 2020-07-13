#!/bin/bash

HEIGHT=1760000
INDEX=0

HASH=$(bitcoin-cli -testnet getblockhash ${HEIGHT})
TXID=$(bitcoin-cli -testnet getblock ${HASH} | jq ".tx[${INDEX}]")

echo ${HASH}

bitcoin-cli -testnet gettxoutproof "[${TXID}]" ${HASH}