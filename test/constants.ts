export const ErrorCode = {
    ERR_INVALID_HEADER_SIZE: "Invalid block header size",
    ERR_DUPLICATE_BLOCK: "Block already stored",
    ERR_PREVIOUS_BLOCK: "Previous block hash not found",
    ERR_LOW_DIFFICULTY: "PoW hash does not meet difficulty target of header",
    ERR_DIFF_TARGET_HEADER: "Incorrect difficulty target specified in block header",
    ERR_NOT_EXTENSION: "Submission is not an extension of the main chain",
    ERR_BLOCK_NOT_FOUND: "Requested block not found in storage",
    ERR_CONFIRMS: "Transaction has insufficient confirmations",
    ERR_VERIFY_TX: "Incorrect merkle proof",
    ERR_INVALID_TXID: "Invalid transaction identifier",
}
