#!/bin/bash

HEIGHT=${HEIGHT:-$(bitcoin-cli -testnet getblockcount)}
DIGEST=$(bitcoin-cli -testnet getblockhash ${HEIGHT})
HEADER=$(bitcoin-cli -testnet getblock ${DIGEST} 0 | cut -c1-160)

echo $HEIGHT
echo $HEADER