#!/bin/bash

TXID=71a127e01023ada604b85c05119e3ede49fe3e465159f5b905d394390a4be02b

curl https://blockstream.info/testnet/api/tx/${TXID}/merkle-proof
