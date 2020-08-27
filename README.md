# BTC-Relay 

## Relevant Repositories

Our libs: 

* https://github.com/interlay/compressed-inclusion-proofs
* https://github.com/crossclaim/btcrelay-sol

External libs:

* Summa Bitcoin SPV library: https://github.com/summa-tx/bitcoin-spv/tree/master/solidity
* Summa Bitcoin Relay: https://github.com/summa-tx/relays/tree/master/solidity
* Original [Deprecated] BTC-Relay: https://github.com/ethereum/btcrelay/tree/develop/fetchd

## Background

### Chain Relays
Chain relays are on-chain programs or <i>smart contracts</i> deployed on a blockchain <i>A</i> capable of reading and verifying the state of another blockchain <i>B</i>. 
The underlying technical design and functionality is comparable to that of SPV-Clients. That is, a chain relay stores and maintains block headers of chain B on chain A and allows to verify transaction inclusion proofs. Summarizing, the two main functionalities a chain relay must/should provide are: <i>consensus verification</i> and <i>transaction inclusion verification</i>.

Read more about chain relays in the <a href="https://eprint.iacr.org/2018/643.pdf">XCLAIM paper</a> (Section V.B descibes the basic concept of chain relays, while Appendix B provides a formal model of the required functionality for PoW chain relays.).  

### Architecture
This project is an implementation of a chain relay for Bitcoin on Ethereum. The first implementation of a BTC relay was implemented in Serpent and can be found <a href="https://github.com/ethereum/btcrelay">here</a>. 
However, as Serpent is outdated (last commit: December 2017), this project aims to implement an updated version in Solidity. 

## Installation

Install dependencies:

```bash
yarn install
```

Build the contracts and interfaces:

```bash
yarn build
```

## Testing

Run the tests:

```bash
yarn test
```

Run with [eth-gas-reporter](https://github.com/cgewecke/eth-gas-reporter):

```bash
export COINMARKETCAP_API_KEY=*****
npx buidler node 
yarn test --network localhost
```

## Gas Costs

```bash
npx buidler run scripts/metrics.ts
```

| Function                 | Gas     | Description  |
|--------------------------|---------|--------------|
| `constructor`            | 1796743 | Genesis      |
| `submitBlockHeader`      | 105299  | 1st Header   |
| `submitBlockHeader`      | 105311  | 2nd Header   |
| `submitBlockHeader`      | 105287  | 3rd Header   |
| `submitBlockHeader`      | 105275  | 4th Header   |
| `submitBlockHeader`      | 105299  | 5th Header   |
| `submitBlockHeader`      | 105263  | 6th Header   |
| `submitBlockHeaderBatch` | 464777  | Combined     |
| `verifyTx`               | 62884   | Inclusion    |

### Summa Relay

[Summa](https://github.com/summa-tx/relays) have also developed a Bitcoin relay in Solidity.
There are a number of differences between the two approaches however. As summarized in the table
below, their block submission is significantly cheaper compared to ours. This is primarily due to
their more restrictive use of storage and separation of functionality - block submission, difficulty adjustment
and fork selection are all separate calls. However, checking transaction inclusion is slightly more involved
as the implementation needs to recurse backwards through all ancestors.

| Interlay | Summa   | Purpose   | Description                  |
|----------|---------|-----------|------------------------------|
| 616782   | 403903  | Submit    | 8 Block Headers              |
| 2397012  | 1520844 | Submit    | 32 Block Headers             |
| 30462    | 32731   | Inclusion | Coinbase - Tx Depth 1        |
| 67240    | 69510   | Inclusion | Heavy (230 Txs) - Tx Depth 1 |
| 67326    | 79540   | Inclusion | Tx Depth 6                   |
| 67326    | 102364  | Inclusion | Tx Depth 32                  |

There are two primary motivations for our higher cost in block submission:

1. The relay should be self-healing, requiring minimal user intervention.
2. Constant time lookup - given a height we should be able to instantly verify inclusion.

## Deployments

```bash
yarn deploy
```

### Ropsten

+ [0x5d1420F7aE3B43F13c7F972Beaa570ae0F7e6cbA](https://ropsten.etherscan.io/address/0x5d1420F7aE3B43F13c7F972Beaa570ae0F7e6cbA)
