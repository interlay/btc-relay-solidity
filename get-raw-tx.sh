#!/bin/sh

if [ $# -lt 1 ]; then
  echo "usage: get-raw-tx HASH
NOTE: needs access to Imperial network"
  exit 1
fi


verbose=false
if [ $# -eq 2 ]; then
    verbose=$2
fi

curl -s \
    -u bitcoinrpc:1F41F6F6EE0363A19F487E9E5E63866CC83776BB0F1529B5C92CC643E282EBFA \
    -d '{"jsonrpc": "1.0", "id":"test", "method": "getrawtransaction", "params": ["'$1'", '$verbose'] }' \
    -H content-type: application/json \
    http://satoshi.doc.ic.ac.uk:8332 | jq -r .result
