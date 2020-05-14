import * as bitcoin from 'bitcoinjs-lib';

function p2pkh(address: Buffer): Buffer {
    return bitcoin.script.compile([
        bitcoin.script.OPS.OP_DUP,
        bitcoin.script.OPS.OP_HASH160,
        address,
        bitcoin.script.OPS.OP_EQUALVERIFY,
        bitcoin.script.OPS.OP_CHECKSIG,
    ]);
}

function mine(block: bitcoin.Block): bitcoin.Block {
    block.merkleRoot = bitcoin.Block.calculateMerkleRoot(block.transactions || [])

    block.nonce = 0;
    while (block.checkProofOfWork()) {
        block.nonce += 1;
    }

    return block;
}

export function generate(prevHash: Buffer): bitcoin.Block {
    let block = new bitcoin.Block()
    block.version = 2;
    block.timestamp = 1588813835;
    block.transactions = [];
    block.bits = 500_000_000;
    block.prevHash = prevHash;

    let hash = Buffer.from("2a083a601b278cff74efa728dc157657d20a4dbe74fab132884d643f3d94ffa0", 'hex');
    let address = Buffer.from("66c7060feb882664ae62ffad0051fe843e318e85", 'hex');

    let builder = new bitcoin.TransactionBuilder();
    builder.addInput(hash, 1000000, 0);
    builder.addOutput(p2pkh(address), 50);
    block.transactions.push(builder.buildIncomplete());

    return mine(block);
}