# BTC-Relay 

## Relevant Repositories

Our libs: 

* https://github.com/interlay/compressed-inclusion-proofs
* https://github.com/crossclaim/btcrelay-sol

External libs:

* Summa Bitcoin SPV library: https://github.com/summa-tx/bitcoin-spv/tree/master/solidity
* Summa Bitcoin Relay: https://github.com/summa-tx/relays/tree/master/solidity
* Original [Deprecated] BTC-Relay: https://github.com/ethereum/btcrelay/tree/develop/fetchd


## Installation

Install dependencies:

```
npm install
```

Build the contracts and interfaces:

```
npm run build
```

## Testing

Run the tests:

```
npm test
```

### TxChain Performance Tests
The `scripts` folder contains test scripts for evaluating the performance/cost improvement of the TxChain transaction aggregation.

## Deploying Contracts 

** TODO **

## Background

### Chain Relays
Chain relays are on-chain programs or <i>smart contracts</i> deployed on a blockchain <i>A</i> capable of reading and verifying the state of another blockchain <i>B</i>. 
The underlying technical design and functionality is comparable to that of SPV-Clients. That is, a chain relay stores and maintains block headers of chain B on chain A and allows to verify transaction inclusion proofs. Summarizing, the two main functionalities a chain relay must/should provide are: <i>consensus verification</i> and <i>transaction inclusion verification</i>.

Read more about chain relays in the <a href="https://eprint.iacr.org/2018/643.pdf">XCLAIM paper</a> (Section V.B descibes the basic concept of chain relays, while Appendix B provides a formal model of the required functionality for PoW chain relays.).  

### BTCRelay-Sol
BTCRelay-Sol is an implementation of a chain relay for Bitcoin on Ethereum. The first implementation of BTCRelay was implemented in Serpent and can be found <a href="https://github.com/ethereum/btcrelay">here</a>. 
However, as Serpent is outdated (last commit: December 2017), this project aims to implement an updated version in Solidity. 