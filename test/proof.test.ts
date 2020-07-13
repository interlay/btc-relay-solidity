import { ethers } from "@nomiclabs/buidler";
import { Signer } from "ethers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Relay } from "../typechain/Relay";
import { RelayFactory } from "../typechain/RelayFactory";
import { ErrorCode } from './constants';
import { Arrayish } from "ethers/utils";

chai.use(solidity);
const { expect } = chai;

async function getBestBlockHeight(relay: Relay) {
  const {digest, height} = await relay.getBestBlock();
  return height;
}

function deploy(signer: Signer, header: Arrayish, height: number) {
  const factory = new RelayFactory(signer);
  return factory.deploy(header, height);
}

describe("Proofs", () => {
  let signers: Signer[];
  let relay: Relay;

  // 592920
  let genesisHeader = "0x0000c020c238b601308b7297346ab2ed59942d7d7ecea8d23a1001000000000000000000b61ac92842abc82aa93644b190fc18ad46c6738337e78bc0c69ab21c5d5ee2ddd6376d5d3e211a17d8706a84";

  beforeEach(async () => {
    signers = await ethers.signers();
    relay = await deploy(signers[0], genesisHeader, 5);
  });

  let tx = {
    version: "0x01000000",
    vin: "0x0101748906a5c7064550a594c4683ffc6d1ee25292b638c4328bb66403cfceb58a000000006a4730440220364301a77ee7ae34fa71768941a2aad5bd1fa8d3e30d4ce6424d8752e83f2c1b02203c9f8aafced701f59ffb7c151ff2523f3ed1586d29b674efb489e803e9bf93050121029b3008c0fa147fd9db5146e42b27eb0a77389497713d3aad083313d1b1b05ec0ffffffff",
    vout: "0x0316312f00000000001976a91400cc8d95d6835252e0d95eb03b11691a21a7bac588ac220200000000000017a914e5034b9de4881d62480a2df81032ef0299dcdc32870000000000000000166a146f6d6e69000000000000001f0000000315e17900",
    locktime: "0x00000000",
    txId: "0x5176f6b03b8bc29f4deafbb7384b673debde6ae712deab93f3b0c91fdcd6d674",
    index: 26,
    intermediateNodes: "0x8d7a6d53ce27f79802631f1aae5f172c43d128b210ab4962d488c81c96136cfb75c95def872e878839bd93b42c04eb44da44c401a2d580ca343c3262e9c0a2819ed4bbfb9ea620280b31433f43b2512a893873b8c8c679f61e1a926c0ec80bcfc6225a15d72fbd1116f78b14663d8518236b02e765bf0a746a6a08840c122a02afa4df3ab6b9197a20f00495a404ee8e07da2b7554e94609e9ee1d5da0fb7857ea0332072568d0d53a9aedf851892580504a7fcabfbdde076242eb7f4e5f218a14d2a3f357d950b4f6a1dcf93f7c19c44d0fc122d00afa297b9503c1a6ad24cf36cb5f2835bcf490371db2e96047813a24176c3d3416f84b7ddfb7d8c915eb0c5ce7de089b5d9e700ecd12e09163f173b70bb4c9af33051b466b1f55abd66f3121216ad0ad9dfa898535e1d5e51dd07bd0a73d584daace7902f20ece4ba4f4f241c80cb31eda88a244a3c68d0f157c1049b4153d7addd6548aca0885acafbf98a1f8345c89914c24729ad095c7a0b9acd20232ccd90dbd359468fcc4eee7b67d"
  }

  it("should fail with insufficient confirmations", async () => {
    // relay = await deploy(signers[0], genesisHeader, 5);
    expect(await getBestBlockHeight(relay)).to.eq(5);

    // checks default stable confirmations
    let result = relay.verifyTx(0, tx.index, tx.txId, genesisHeader, tx.intermediateNodes, 0, false);
    expect(result).to.be.revertedWith(ErrorCode.ERR_CONFIRMS);

    // checks custom period
    result = relay.verifyTx(0, tx.index, tx.txId, genesisHeader, tx.intermediateNodes, 100, true);
    expect(result).to.be.revertedWith(ErrorCode.ERR_CONFIRMS);
  });

  it("should fail with block not found", async () => {
    relay = await deploy(signers[0], genesisHeader, 100);
    expect(await getBestBlockHeight(relay)).to.eq(100);

    // checks default stable confirmations
    let result = relay.verifyTx(0, tx.index, tx.txId, genesisHeader, tx.intermediateNodes, 0, false);
    expect(result).to.be.revertedWith(ErrorCode.ERR_BLOCK_NOT_FOUND);
  });

  it("should validate inclusion", async () => {
    relay = await deploy(signers[0], genesisHeader, 1);
    expect(await getBestBlockHeight(relay)).to.eq(1);

    await relay.verifyTx(1, tx.index, tx.txId, genesisHeader, tx.intermediateNodes, 0, true);
  });

  it("should validate empty block coinbase", async () => {
    const header = "0x000000208eac45cbfb6620c53cbe8d20dd637f5e305118fa798f337d92210300000000009f3bf29af9132c4df7edb1d6f1f6306da12a28295d0918d2e424d27418b74d821aa9dc5ef0ff0f1ba5938e48";
    const height = 1760000;

    relay = await deploy(signers[0], header, height);
    expect(await getBestBlockHeight(relay)).to.eq(height);

    const txId = Buffer.from("824db71874d224e4d218095d29282aa16d30f6f1d6b1edf74d2c13f99af23b9f", 'hex').reverse();

    await relay.verifyTx(height, 0, txId, header, [], 0, true);
  });

  let testnet1 = {
    txId: "e50f29833077b92270a011594c87d8e2b02f80c4cf010adf4006587877381808",
    index: 64,
    intermediateNodes: [ 
      "4bcd5ffb40a136e53357f0bc575ccd22f3383d61c7d30b520a98d5bc2bde2f0a",
      "8b5864ec60f6c05ef25fbe0abf530964e7f06de5869ff0a6442f7f303a09552f",
      "57a0e382816bf2393cadde9afe8abc5c3cd7224df6cb1b7b7829b3470d1c10c4",
      "9bdd0449644b5785872b001813d9f5e468e903f756a7ff0cafdd39cdbb207afe",
      "f9e56e0cbfd8f769dbd4b9dc82441ba82ac70c1254a864d31db391403cfb5b76",
      "ee1db72e0346d9efbc52ef0cc20664d3174d9bbaa52b579f56797a868492fcb8",
      "87a266e624908d7fe6c8ec3ba35a34f4e5b3e577e29d5404f6c141646876ac3e",
    ],
    header: "0x00000020c29de51a684e5219b6cfe25f6999a31e05b5626a33478a8e6ed4869d000000005125f5cb99ebbfc5d2397d8282bd849aee26f984111230c8c42ee25dbd361e944d20d95effff001d97bebd41",
    headerHash: "0x000000000ee8388b0c4b935dec68824af4ad284dda2065d3eab526f207b17d8c",
    height: 1747715,
  };

  it("should validate inclusion (testnet1)", async () => {
    relay = await deploy(signers[0], testnet1.header, testnet1.height);
    expect(await getBestBlockHeight(relay)).to.eq(testnet1.height);

    let proof = testnet1.intermediateNodes.map((value) => Buffer.from(value, 'hex').reverse().toString('hex')).join("");
    let txid = Buffer.from(testnet1.txId, 'hex').reverse().toString('hex');

    await relay.verifyTx(testnet1.height, testnet1.index, "0x" + txid, testnet1.header, "0x" + proof, 0, true);
  });

  let testnet2 = {
    txId: "73582c8fddd60c0778bb9d449231d732f797c7d1e8197a62135b792291c9a12a",
    index: 26,
    intermediateNodes: [
      "12e3bce112e5744a17d3b28c675dab949921793ded7d9faaca3acc9f5778aa80",
      "a6fd121f036eb80f9af9e8c67b4ace9dd7b8eb4e7846a3f252ded91d0c189d76",
      "eebe422586731163966ebdff7f7a7c79602eb1d501786d03fffbbf4b55004c3c",
      "82e7be4cbc28e6c6e7624b6bd84bab794fb8fccfbfad3416b46f6172798ced5d",
      "49c30a3753ec196af0931d9e4e4269f8d0ff09815f848026d5e0fa8b8cb242ef",
      "33824ede7279221f779a0dc899028c5fff694376bb73bb0195985e2fd2431de9",
      "03857fe3d3bb2e412e309c616f89ae2d7a4219adaa608f0480ae4ca4391046a9",
    ],
    header: "0x00e0ff2ffb2b253e060112bed62614fcf9ae61f82c08d9e6c36a1b53070000000000000003b91283ae15b75dc2023735356f1412411d07ece715f3ed0e612ab4349b7db83030eb5ef2a5011add0c8e82",
    headerHash: "0x00000000000000f6cf3b73d47abb326b4a60e23ce24e02396e9edfe5c95622f5",
    height: 1772070,
  };

  it("should validate inclusion (testnet2)", async () => {
    relay = await deploy(signers[0], testnet2.header, testnet2.height);
    expect(await getBestBlockHeight(relay)).to.eq(testnet2.height);

    let proof = testnet2.intermediateNodes.map((value) => Buffer.from(value, 'hex').reverse().toString('hex')).join("");
    let txid = Buffer.from(testnet2.txId, 'hex').reverse().toString('hex');

    await relay.verifyTx(testnet2.height, testnet2.index, "0x" + txid, testnet2.header, "0x" + proof, 0, true);
  });

  let testnet3 = {
    txId: "71a127e01023ada604b85c05119e3ede49fe3e465159f5b905d394390a4be02b",
    index: 30,
    intermediateNodes: [
      "65604897c34192eb81daa8a711c7a11796ccb930b0805efa56abfb663c1699d6",
      "99dd48c5c7ebf148dafb9825db6d7e6a4c051faea96db1eb0e6fd42a9be7c71f",
      "188132f8725c964fe710857042f47c7bc57bd93672629d70859385fad2db33f9",
      "e09ee89285475ab8afdd83efa5c9ede805abb4412227d3103d89169649a16894",
      "f48041eb197669babf2991d39afea85b2b5cc78bc9bc2a69bdcf750626184511",
      "0c91009701d6665535149683b8bc7116ce7d5d794b31f4839331062808c0b4ed"
    ],
    header: "0x00e0ff27c57b44820f2629d53e7ed7f1cb147407b6b059b1d9c479414901000000000000b3d9797f1e11c29e5f955051b3ab9a20043777f6620c5ebe3a01955c25196f9349f6f15ef2a5011aa9b53fc8",
    headerHash: "0x00000000000000155b7e1e56cc21226981bb7bdf4c506f35c00aa01649321566",
    height: 1773152,
  };

  it("should validate inclusion (testnet3)", async () => {
    relay = await deploy(signers[0], testnet3.header, testnet3.height);
    expect(await getBestBlockHeight(relay)).to.eq(testnet3.height);

    let proof = testnet3.intermediateNodes.map((value) => Buffer.from(value, 'hex').reverse().toString('hex')).join("");
    let txid = Buffer.from(testnet3.txId, 'hex').reverse().toString('hex');

    await relay.verifyTx(testnet3.height, testnet3.index, "0x" + txid, testnet3.header, "0x" + proof, 0, true);
  });

  let mainnet1 = {
    txId: "9f0370848f7bbf67908808997661a320af4f0075dce313e2934a576ed8204059",
    index: 104,
    intermediateNodes: [
      "590c8ceb56383e61c7002d18e35c7ea0f6e6d8cc05221c791eaa90bc50e172af",
      "21bc92abd2b0d97bbe3b65a76d420209277d0e2bd3a9974ca7680bcbee115752",
      "6babdaf89052998ab048bc12db408bc3e2e30f70add044ed9a032a60db27ad98",
      "c9be68e2dd903e2de000b9b2ca2c02544fbaf0c71c14da82f13aaf7fa1d2d8e8",
      "a0ed0aa4629a69dc2c764e1395bdd7c6688336fccf8643a07b36be60dfd7a340",
      "46e621f7fa78f6d54123b3ef91b520fda523d35533b760990f178f1fd0fb00d6",
      "5660db59d56bbb416773d474bdd472ddea40c96b09a9e32b24017e59ab50e4f0",
      "f8d7a8087256bae032c4576046b13af00033c2f335a55619e4b4e27a17cd8472"
    ],
    header: "0x00000020a1d2b3b757ad55fa1c670f9f59372a2a26f1a85197711e00000000000000000070be58da7ef0a754ef5947910fa1bb0c19160d641cf212ae46ba53e0327233bc2367905b2dd729174c3ae2db",
    headerHash: "0x00000000000000000021868c2cefc52a480d173c849412fe81c4e5ab806f94ab",
    height: 540107,
  };

  it("should validate inclusion - large block (mainnet1)", async () => {
    relay = await deploy(signers[0], mainnet1.header, mainnet1.height);
    expect(await getBestBlockHeight(relay)).to.eq(mainnet1.height);

    let proof = mainnet1.intermediateNodes.map((value) => Buffer.from(value, 'hex').reverse().toString('hex')).join("");
    let txid = Buffer.from(mainnet1.txId, 'hex').reverse().toString('hex');

    await relay.verifyTx(mainnet1.height, mainnet1.index, "0x" + txid, mainnet1.header, "0x" + proof, 0, true);
  });
});