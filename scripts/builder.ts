import * as bitcoin from 'bitcoinjs-lib';

function p2wpkh(data: Buffer): Buffer {
  return bitcoin.script.compile([
    bitcoin.script.OPS.OP_0,
    bitcoin.script.OPS.OP_20,
    data
  ]);
}

export function genesis(): bitcoin.Block {
  const block = new bitcoin.Block();
  block.version = 1;
  block.timestamp = 1296688602;
  block.bits = 545259519;
  block.prevHash = Buffer.from(
    '0000000000000000000000000000000000000000000000000000000000000000',
    'hex'
  );
  block.merkleRoot = Buffer.from(
    '3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a',
    'hex'
  );
  block.nonce = 2;
  return block;
}

function mine(block: bitcoin.Block): bitcoin.Block {
  block.merkleRoot = bitcoin.Block.calculateMerkleRoot(
    block.transactions || []
  );

  block.nonce = 0;
  while (!block.checkProofOfWork()) {
    block.nonce += 1;
  }

  return block;
}

export function generate(address: string, prevHash?: Buffer): bitcoin.Block {
  const block = new bitcoin.Block();
  block.version = 536870912;
  block.timestamp = 1592233681;
  block.bits = 545259519;
  block.prevHash = prevHash;

  const tx = new bitcoin.Transaction();
  tx.ins = [
    {
      hash: Buffer.from(
        '0000000000000000000000000000000000000000000000000000000000000000',
        'hex'
      ),
      index: 4294967295,
      script: Buffer.from('520101', 'hex'),
      sequence: 4294967295,
      witness: [
        Buffer.from(
          '0000000000000000000000000000000000000000000000000000000000000000',
          'hex'
        )
      ]
    }
  ];
  const addr = bitcoin.address.fromBech32(address);
  tx.outs = [
    {
      value: 5000000000,
      script: p2wpkh(addr.data)
    },
    {
      value: 0,
      script: Buffer.from(
        '6a24aa21a9ede2f61c3f71d1defd3fa999dfa36953755c690689799962b48bebd836974e8cf9',
        'hex'
      )
    }
  ];
  block.transactions = [];
  block.transactions.push(tx);

  return mine(block);
}
