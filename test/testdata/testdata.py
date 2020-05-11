import subprocess
from subprocess import CalledProcessError
from os import path
import json

import bitcoin.rpc
from bitcoin.core import *
from bitcoin.core.script import *
from bitcoin.wallet import *

DIRNAME = path.dirname(__file__)
FILENAME = path.join(DIRNAME, 'blocks.json')
BLOCKS = 20

bitcoin.SelectParams('regtest')

# Using RawProxy to avoid unwanted conversions
proxy = bitcoin.rpc.RawProxy()

# Generates a number of blocks
# @param number: number of blocks to generate
# returns number of block hashes
def generateEmptyBlocks(number):
    # setup address to generate blocks
   
    # generate first 101 blocks (maturation period + 1)
    return proxy.generatetoaddress(number, address_1)[0]


def generateBlockWithTx(numberTx):

    for i in range(numberTx):
        proxy.sendtoaddress(address_2, 0.0001)
    
    return proxy.generatetoaddress(1, address_1)[0]



    # send coins 
    # proxy.sendtoaddress(address2, 10)

    # blocks = []
    # for blockhash in list(blockhashes):
    #     # print(blockhash)
    #     blocks.append(proxy.getblockheader(blockhash))


#
# Exports the block headers to a JSON file
# @param blockhashes: 
def exportBlocks(blockhashes):
    # height = proxy.getblockcount()
    blocks = []
    for blockhash in blockhashes:
        block = proxy.getblock(blockhash) 

        # convert to hex as wanted by solc (only fields used in relay)
        block["hash"] = "0x" + block["hash"]
        block["merkleroot"] = "0x" + block["merkleroot"]
        block["chainwork"] = "0x" + block["chainwork"]
        txs = block["tx"]
        headerBytes = proxy.getblockheader(blockhash, False)
        block["header"] = "0x" + headerBytes
        # queries the bitcoin-rpc gettxoutproof method
        # https://chainquery.com/bitcoin-cli/gettxoutproof#help
        # returns a raw proof consisting of the Merkle block
        # https://bitcoin.org/en/developer-reference#merkleblock
        proofs = []
        for i in range(len(txs)):
            # print("TX_INDEX {}".format(i))
            try:
                tx_id = txs[i]
                # print("TX {}".format(tx_id))
                output = subprocess.run(["bitcoin-cli", "-regtest", "gettxoutproof", str(json.dumps([tx_id])), blockhash], stdout=subprocess.PIPE, check=True)

                proof = output.stdout.rstrip()
                # Proof is
                # 160 block header
                # 8 number of transactionSs
                # 2 no hashes
                number_hashes = int(proof[168:170], 16)

                merklePath = []
                for h in range(number_hashes):
                    start = 170 + 64*h
                    end = 170 + 64*(h+1)
                    hash = proof[start:end]
                    merklePath.append("0x" + hash.decode("utf-8"))

                # print(merklePath)

                block["tx"][i] = {"tx_id": "0x" + str(tx_id), "merklePath": merklePath, "tx_index": i}

            except CalledProcessError as e:
                print(e.stderr)
            
        
        blocks.append(block)



    with open(FILENAME, 'w', encoding='utf-8') as f:
        json.dump(blocks, f, ensure_ascii=False, indent=4)

    print("### Exported {} blocks to {} ###".format(len(blocks), FILENAME))


    # print("### Exported {} proofs to {} ###".format(len(txhashes),file))

# BE<>LE conversion
def flipBytes(b):
    byteSize = 2
    chunks = [ b[i:i+byteSize] for i in range(0, len(b), byteSize) ]
    reversed_chunks = chunks[::-1]
    return ('').join(reversed_chunks)
    

if __name__ == "__main__":

    address_1 = proxy.getnewaddress()
    address_2 = proxy.getnewaddress()

    generateEmptyBlocks(2018)

    # first block is empty
    blockhashes = []
    
    blockhashes.append(generateEmptyBlocks(1))
    blockhashes.append(generateEmptyBlocks(1))

    
    # generate block with 1 TX
    blockhashes.append(generateBlockWithTx(1))

    # generate a block with a lot of TX
    blockhashes.append(generateBlockWithTx(50))

    # fill with blocks
    for i in range(BLOCKS):
        blockhashes.append(generateBlockWithTx(1))


    exportBlocks(blockhashes)


