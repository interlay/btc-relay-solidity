#!/bin/bash

#bitcoind -regtest -daemon -rest -txindex



#
ADDRESS1=$(bitcoin-cli -regtest getnewaddress "sender") 
ADDRESS2=$(bitcoin-cli -regtest getnewaddress "receiver")

bitcoin-cli -regtest generatetoaddress 101 $ADDRESS1

bitcoin-cli -regtest sendtoaddress $ADDRESS2 10

bitcoin-cli -regtest generatetoaddress 10 $ADDRESS1

