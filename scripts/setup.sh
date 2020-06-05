#!/bin/bash

bitcoind -regtest

BTC_ADDRESS=$(bitcoin-cli -regtest getnewaddress)
bitcoin-cli -regtest generatetoaddress 101 ${BTC_ADDRESS}
bitcoin-cli -regtest getbalance