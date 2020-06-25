#!/bin/bash

TXID=b7c1e5feb5a79d82b6502bf160e3787f0f4189a30ffc2f3a9ef641d0592ae7b1

curl https://blockstream.info/testnet/api/tx/${TXID}/merkle-proof --output -

echo -e "\n"

curl https://blockstream.info/testnet/api/tx/${TXID}/hex --output -
