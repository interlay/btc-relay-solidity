

exports.GENESIS = {
    HEADER: "0x0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c",
    HEADER_INFO: {
        VERSION: 1,
        TIME: 1231006505,
        NONCE: 2083236893,
        MERKLE_ROOT: "0x4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
        TARGET: 26959535291011309493156476344723991336010898738574164086137773096960
    },
    BLOCKHEIGHT: 0,
    LAST_DIFFICULTY_ADJUSTMENT_TIME: 0,
    CHAINWORK: 0
}

exports.HEADERS = {
    BLOCK_1 : "0x010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299",
    BLOCK_1_INVALID_POW: "0x010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d61900000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d00000000", 
    BLOCK_2 : "0x010000004860eb18bf1b1620e37e9490fc8a427514416fd75159ab86688e9a8300000000d5fdcc541e25de1c7a5addedf24858b8bb665c9f36ef744ee42c316022c90f9bb0bc6649ffff001d08d2bd61"
}

exports.BLOCKHASHES = {
    GENESIS: "0x000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
    BLOCK_1: "0x00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048",
    BLOCK_2: "0x000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da3fdcc99ddbd"
}


exports.ERROR_CODES = {
     ERR_GENESIS_SET : "Initial parent has already been set",
     ERR_INVALID_FORK_ID : "Incorrect fork identifier: id 0 is no available",
     ERR_INVALID_HEADER : "Invalid block header",
     ERR_DUPLICATE_BLOCK : "Block already stored",
     ERR_PREV_BLOCK : "Previous block hash not found", 
     ERR_LOW_DIFF : "PoW hash does not meet difficulty target of header",
     ERR_DIFF_TARGET_HEADER : "Incorrect difficulty target specified in block header",
     ERR_NOT_MAIN_CHAIN : "Main chain submission indicated, but submitted block is on a fork",
     ERR_FORK_PREV_BLOCK : "Previous block hash does not match last block in fork submission",
     ERR_NOT_FORK : "Indicated fork submission, but block is in main chain",
     ERR_INVALID_TXID : "Invalid transaction identifier",
     ERR_CONFIRMS : "Transaction has less confirmations than requested", 
     ERR_MERKLE_PROOF : "Invalid Merkle Proof structure",
     ERR_BLOCK_NOT_FOUND: "Requested block not found in storage"

}