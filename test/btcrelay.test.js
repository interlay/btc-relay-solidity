const BTCRelay = artifacts.require("./BTCRelay.sol");

const helpers = require("./helpers");
const truffleAssert = require("truffle-assertions");

const testdata = require("./testdata/blocks.json");

const flipBytes = helpers.flipBytes;

// Correct functionality test cases
contract("BTCRelay", async (_accounts) => {
    let relay;

    const storeGenesis = async function () {
        const genesis = testdata[0];
        await relay.setInitialParent(
            genesis.header,
            genesis.height
        );
    };

    beforeEach("(re)deploy contracts", async function () {
        relay = await BTCRelay.new();
    });

    it("set Genesis as initial parent ", async () => {
        const genesis = testdata[0];
        const submitHeaderTx = await relay.setInitialParent(
            genesis.header,
            genesis.height
        );
        // check if event was emmitted correctly
        truffleAssert.eventEmitted(submitHeaderTx, "StoreHeader", (ev) => {
            return ev.blockHeight.toNumber() === genesis.height;
        });

        // check header was stored correctly
        const storedHeader = await relay.getBlockHeader(genesis.hash);
        assert.equal(storedHeader.blockHeight.toNumber(), genesis.height);
        assert.equal(flipBytes(storedHeader.merkleRoot), genesis.merkleroot);
        console.log("Gas used: " + submitHeaderTx.receipt.gasUsed);
    });

    it("submit 1 block after initial Genesis parent ", async () => {
        await storeGenesis();
        const block = testdata[1];
        const submitBlock1 = await relay.storeBlockHeader(block.header);
        truffleAssert.eventEmitted(submitBlock1, "StoreHeader", (ev) => {
            return ev.blockHeight.toNumber() === block.height;
        });

        console.log("Total gas used: " + submitBlock1.receipt.gasUsed);
    });

    it("VerifyTx with confirmations", async () => {
        await storeGenesis();
        const block1 = testdata[1];
        const submitBlock1 = await relay.storeBlockHeader(block1.header);
        truffleAssert.eventEmitted(submitBlock1, "StoreHeader", (ev) => {
            return ev.blockHeight.toNumber() === block1.height;
        });

        // push blocks
        const confirmations = 3;
        for (const block of testdata.slice(2, 8)) {
            await relay.storeBlockHeader(block.header);
        }

        const tx = block1.tx[0];
        const verifyTx = await relay.verifyTx(
            tx.tx_id,
            block1.height,
            tx.tx_index,
            tx.merklePath,
            confirmations
        );
        console.log("[verify tx] Total gas used: " + verifyTx.receipt.gasUsed);
        truffleAssert.eventEmitted(verifyTx, "VerifyTransaction", (ev) => {
            return ev.txid === tx.tx_id;
        });
    });

    it("VerifyTx large block", async () => {
        await storeGenesis();
        for (const block of testdata.slice(1, 3)) {
            relay.storeBlockHeader(block.header);
        }
        const block = testdata[3];

        const submitBlock = await relay.storeBlockHeader(block.header);
        truffleAssert.eventEmitted(submitBlock, "StoreHeader", (ev) => {
            return ev.blockHeight.toNumber() === block.height;
        });

        // truffleAssert.eventEmitted(submitBlock2, 'StoreHeader', (ev) => {
        //    return ev.blockHeight == block2["height"];
        // });

        const confirmations = 0;

        const tx = block.tx[0];
        const verifyTx = await relay.verifyTx(
            tx.tx_id,
            block.height,
            tx.tx_index,
            tx.merklePath,
            confirmations
        );

        console.log("[verify tx large] Total gas used: " + verifyTx.receipt.gasUsed);
        truffleAssert.eventEmitted(verifyTx, "VerifyTransaction", (ev) => {
            return ev.txid === tx.tx_id;
        });
    });

    describe("verifyTxMulti", function () {
        // raw transaction with 10 inputs and 1 output
        // generated using C++ data generator, witness not included
        // tx with witness:
        // 0x0200000000010aa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698910000000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698910d00000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698914c00000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698912e00000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698913500000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698911600000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698910400000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698914400000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698914400000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698915e00000000ffffffff01a032eb0500000000160014c97ec9439f77c079983582847a09b6b5e6fd2e8602483045022100c874b114b290be528e243a2cc5f3137c0a203f5258313815d83dfc42390fd1a3022029679180847d8772fb5b9433e95a8e9fb5b893ce60afda876e7eea4d97ad38df012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f02483045022100c854680bbc9297b5d348604da151af6df30c033526a05ef5b7d5fe015691145e0220554e67c888f3cf23483a9bf8c6c4312f6f9b4957c756e29de0da08e3f43cce12012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f024730440220333339476602bc37b20b5da552d140ebbd8b7f73687c2802bb4e80d31794164602206e4a22ddffc3c8cccc6b5b2ede3ea5a3e93f17125115c015cc551dd5d75b22eb012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f0247304402206c87165bd3976b6dbfd4ccd3c653bcfa4ec6f23d4b5cbae6f1beae71080febd2022023e6f51f3744790d7c4253f46bbd10e953da720404461a928d1d811b6ad6813d012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f02483045022100dda30025b3911f5474d6f9b380fb8e45bba87a2f352b64c07ef0e4557934a2fe022040aa1b98d5960dcb27a5fb6af8223860d79d14faf622572afe901f56479dac56012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f0247304402202aeed5c9b290ccc3059e56577a8ef0e7855b04f0bf2a9124d25ba021cd986fd2022068f2185231e6281b94dc5aad476accd2c12fb8e8ce0912c4a1a65942e1610664012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f02483045022100a9bc02536457d29a48cbd07dcb631082a336d12b315858a206448ceef110c830022064b0b329a4a1209641370ede93128e596c68b8132e6155cddeac912df8f50cef012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f0247304402200fd75a27fdd1efb8e861be09eec5e9f65ca5f6fcb3efaffeed476c39af0383b202207c52e94dc835dcc0968dba651e3d9e6cd41bfcf252a152a4ad98601b564b274b012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f0247304402200fd75a27fdd1efb8e861be09eec5e9f65ca5f6fcb3efaffeed476c39af0383b202207c52e94dc835dcc0968dba651e3d9e6cd41bfcf252a152a4ad98601b564b274b012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f02483045022100b6de698f54fc633383e1cb78b4bcf9a7507d1cc7e868405d63a1221d68f63cc902201486e8af37c2557b7eb5ced105cc4b70a26214609f5b1857a610a0f1c58050fa012103eec785a16054b40bfe15c287beca7f214f88742501fabbe18251502c0ea0588f00000000
        // tx id: ca9d8ae152798e9f3ca5ea2157acbff7832274555adbfef405d43a04cb55b7d7
        // tx hash: 549fe3d34777ffe6b61edbf203496660c9d0a4a865c3b0840a2adb7f4d57ea88
        const rawTransaction = "0x020000000aa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698910000000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698910d00000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698914c00000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698912e00000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698913500000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698911600000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698910400000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698914400000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698914400000000ffffffffa6f0d82981c7d7fd424c97548be1b246161097532e102c0457f46ad5870698915e00000000ffffffff01a032eb0500000000160014c97ec9439f77c079983582847a09b6b5e6fd2e8600000000";

        it("should succeed", async () => {
            await storeGenesis();
            for (const block of testdata.slice(1, 4)) {
                await relay.storeBlockHeader(block.header);
            }
            const block = testdata[3];
            const tx = block.tx[0];
            const args = [
                tx.tx_id,
                rawTransaction,
                block.height,
                tx.tx_index,
                tx.merklePath,
                0
            ];
            const verifyMulti = await relay.verifyTxMulti.apply(relay, args);
            console.log("[verifyTxMulti] Total gas used: " + verifyMulti.receipt.gasUsed);
            const verifyMultiResult = await relay.verifyTxMulti.call.apply(relay, args);
            // transaction hash is wrong
            assert.equal(verifyMultiResult.success, false);
            // 10 transaction hashes of 32 bytes (hex encoded) each + leading '0x'
            assert.equal(verifyMultiResult.txids.length, 10 * 64 + 2);
        });
    });

    it("Parse TXChain Proof Transaction - 9 inputs", async () => {
        const rawtx = "0x020000000930c4acb20b7793dc8a708d19a29b1e19c4c785f7ddf3522e1eaafbdf8e77b604460000006b48304502210097f7be7fcb7eae0e145ee52c951f174f287ac395fa5d4046cdd24459835431d3022034ae219014e04816d345f1436b9c69f0411f2ad8ecc3494a22ba4eb94e2fe118012103cd900bac6dcbc7704f02dd771eeeb123be5a79e301f7d83651146cb2b03f5e21feffffff4647788246abcff5168181d58a8a88fa0272ad22175e22abf2a93f20a4cdd3ae000000006a4730440220595083dcf346cfeb4cfa8a81df2b22b26cded3a4ff0e04d92c35eb87f87cd3d4022010fbefab9d4e5651c100d20f51deafd405a3f7f908582b73d7bce76633ff0a960121021d8e5ac784dea697199d1bb1dfd0c4ea85886bc0d1b74744397e1cf7588ae9defeffffff6267898427e0ce643ddf34b6f0b5c1d43cc1d94396b868d9a9a7a7382c642602000000006b4830450221008b939990e61c7f24ce13a0e8ffdfc51cec6eb7947916345347f6a228fdc96f720220605b925c835216c02dd8aeacd30e6d4abedc5d5c1ed801782186e32568bb0473012103977cd6c5f32713609471142c3b75f5b707155dde9acf519c0201c4a94fbe3f40feffffff7c3a17f90902e0f2223928edcd84926cfd37a212cc16416ce21c5f72a83041106c0700006b4830450221009ec1825f50eeeabf0882c416c079bd7116b25d91eeeb83ff709eb10e1c3f5fdd02201daa80d42e2f2a910fb7dbb6e6bffdc51654d78a82dfdb2d042a5c46cc85dabb0121023c7df3058f9a17becaa8f7608f14ef67fb9e077bbfd013d1b04ca274ea832c02feffffffa750bfc2a42ee3b12b5edea8c2b9e6dcda7803987f913b9c4502a468606ffd51050000006b483045022100d87b00209f902ff5e6bc509775b56e5041de6b08f5ef9eabcdf761031738ef48022016e41d11e9fce0870afebd53f21c1fcdd82ac528560a2a6da45c1da31f0d9b8d012103623ad5ca7b664d41c89d0f20a61ff40989afc56fb932478b15d381820340b063feffffffaeb0b904077370f4f34303536fd01cba926a13929dc74fa9e99e8eb63e3932fb010000006b483045022100b3ff4e39714db8669e30f1a6cff8ca30e88f8663a00b062ebb3a67593e91112802207a6efaaa5ec1df77ed6562cfe954d3ffe84199f1d97f6afd671fe3930e99ec64012103c2605f6106ea0a09a021ca5a10d25fd6cc8a03e9159052819feb428137e0519bfeffffffbbc35445ffc237eb38ec98c5afed0a562aa00770e077cb8bad454debdc5c0460000000006b48304502210092a5355f38543a9008f9acf2178622fbeead6dfcd0dcf3d9fa2f12854ff8f6840220679a7a04116c19d8e0c61bd985fafcbfbfaec4f808198141e9cff65aeec8f5a60121037cb3349987ff0c3c8594ddd0e1efe83eb2d7a485411f1c60b1f35aeef234c864feffffffc1d99f01325bdccbec53d304b0b6e38a653d76e943cf563b245c2b5480b7b1dd000000006a473044022024548927d1589c0a619a079609a7119aaeccfe52ffc104c7d7ee99a9116409e4022079df31876d482b7c5d11a8d3ca65402708700586ae692fa657b4032e76cf0351012102c711ac2beb7d4c9f5e4457fe6a01905f08f3a745f89320d6b53d1190e0fcff50feffffffebdaee2207b2fa11cc3ed2815a9b57bc45d9c067f45a4f048b22e308734741bb0d0000006a473044022053a3435f6da2e4bc3118216a8461afc7d395642ae99610442106fb2f39ae58b602202d50d829a2ffdeea691ee231df37f31bc0daba136e2895377823a2f7d6aaf195012102a362b0975d13db369765ddb31c76bfc8db974a50fd0e79a3e211b143853a4a0cfeffffff0282d4c211000000001976a914e8cea30989bd15530f819b766684b00dc7ba7cfa88accffe0e000000000017a914e9f5b14695e4f69cf3000c56a53224a61d2967fe8768840900";

        const _txids = [
            "0x04b6778edffbaa1e2e52f3ddf785c7c4191e9ba2198d708adc93770bb2acc430",
            "0xaed3cda4203fa9f2ab225e1722ad7202fa888a8ad5818116f5cfab4682784746",
            "0x0226642c38a7a7a9d968b89643d9c13cd4c1b5f0b634df3d64cee02784896762",
            "0x104130a8725f1ce26c4116cc12a237fd6c9284cded283922f2e00209f9173a7c",
            "0x51fd6f6068a402459c3b917f980378dadce6b9c2a8de5e2bb1e32ea4c2bf50a7",
            "0xfb32393eb68e9ee9a94fc79d92136a92ba1cd06f530343f3f470730704b9b0ae",
            "0x60045cdceb4d45ad8bcb77e07007a02a560aedafc598ec38eb37c2ff4554c3bb",
            "0xddb1b780542b5c243b56cf43e9763d658ae3b6b004d353eccbdc5b32019fd9c1",
            "0xbb41477308e3228b044f5af467c0d945bc579b5a81d23ecc11fab20722eedaeb"
        ];

        // Input parin fails
        const extractInputTxids = await relay.extractInputTxids(rawtx);
        // console.log(extractInputTxids.length);
        // console.log(extractInputTxids);

        /*
        let validateTxChainTransaction = await debug(relay.validateTxChainTransaction(rawtx, txids));

        truffleAssert.eventEmitted(validateTxChainTransaction, 'CheckTxChainProof', (ev) => {
            return ev.txids == txids;
        });
        */
        console.log("Total gas used: " + extractInputTxids.receipt.gasUsed);
    });

    it("Parse TXChain Proof Transaction - 21 inputs", async () => {
        const rawtx = "0x020000001607a84373d0e90d2cd421e44b21c7f9237eee9b9c94e9b68bd39fd5f6a2e72317000000006a473044022072327e03256cb5b4cad5172b027bcb917adb25f5ea486d673529bcd66b551e950220461f9ceec53562825e91f01a1602a62d05d41e49dfc9437fc6d80b439bc269610121031b50e0ef4a2486589b0533667c6fd41c901ceaa6b5851114111b21de09bf54eefeffffff16dcbf45ca1356673868c415b9e2d223fa1f679cc594effa8ddf624573c9a426010000006b483045022100df1015c5b7437edba7b8037ec18896a4e0f28dec1de34062e869558b0c3c036e0220277dd932144de802e4ce84a7b72ce8bebc6e1eb581f6f71317e7e9cf8c24c4b6012102ac925311600005b5b804b20d8820c63f7558d18cb80ca0b788f46a5a5e110f3bfeffffff1f1e3dececde64cb76c9abc43630ef5057ad83d3109be0dba9f1817c7fad6c830d0000006a47304402204054e1b22598aaf334f2dcadda00d667f7f81bba3bae8f1e8e8a25a9ad6f137e02201853bcde48a26dd803e64f49510885bc5cb670f89a2f99aa0906875be263b0f4012103ab8c6632168331cd3ae4e777de0c932287694efbd16a986ee0f3d765ef0509c0feffffff22a12ec2ea718e950a3916eba168e229c5b58567742726eaec62bc2ab5a1aa1b0a0000006a4730440220053adcd93ee5f9c12fb84945c0cfd332b243abe2132b71bd01d6c5235041429802207c5ed180325e53f89afe3d0f85e7c154101ec9db13f85e3b8e3a6a8b71c5369c0121035c94d1e4b62fca4a7a36b42635263e43f19360b5c04cc555671835e154f63b2ffeffffff22a12ec2ea718e950a3916eba168e229c5b58567742726eaec62bc2ab5a1aa1b100000006a473044022002799524b3fe1010c3a568ad9f9629c140e6f3bc687814b21f5e20fee3b0f97a02207c763c21e97c66ce9e7bd1a6f9152434d247e718c1375169bb9531f85801a3630121038b615710110684d06a60548a753cc063dfc477102dd306521e61f5028a7cc365feffffff23766095dcb96c305031253f6fab33dc35910d5a9ffaad6632c2aa825419562a040000006b483045022100a648e60daab3702d671962fab59ad28ff734735ba3b23b590100beb6d006c25302200d7248393e94b221215462e812624beaf7aceb317d74a124e4f20d3a25e4b2f1012102436e14e113f7b799f6ce3017bc086d559c3f46132886914fdd0fcca2caaf1b87feffffff32a8550ef848bc0193377a57cd29df06d0d39d31de484e42dc4d64c38ca5507c010000006b483045022100b635f036c91a6b0a20b1389068729672970a9e742bea1a908833f869285c105402204b26e064f9660db0a892f566d25f4ed6102643d9a725e76155b5214d1640c19701210371f3af5da93b6fc298712f4c0e64406ea8cf7ab07387bc5ff2d2be5e50271898feffffff4486816b67fbbc019b2cd646745016d1c9534852c7927fe08ce86f1c2570d982000000006a473044022063f1420bf5ad761ca08188715336c471c014c10c224ec36e46fabaa185736d8b022018223609c0850ef1f40b3ccb60e76d1d59894868227c4d0f7a1a0c0b8d2f129b012103c297a26583032bd69522c7bf34f18b5633a11ae8a6659cc8cb3820a96048f5ebfeffffff4611eccacad22f76bbd63e03ce9e41642a5fb4823f025a4d4433411515abf311000000006a47304402201af65cfc1ff8ed6ade30a15c63df70a29eb959c0c8b31b4a94435873ae88813d022059f26605007a02a7b75a88d196b6b2fd12fe099218eedc0694ca5b344022991a0121034db77ff53c8aeb96f2f6d568c190947248d5a08c70060e12b12661fde13cd032feffffff46b98354131858ea500a4262c416f77238f1a2e0babcee7fd2fd13c04ecc6fb7020000006b483045022100f9855bcb5bb955be549b4bdba0bc56a9d7f5cafa70954893ae6d86e132283e0f02206dce61ef8ff65cafd5ed1ec343cb3abfa401afb3d5a07d8dea861fbee4e08d6301210310e8a36cd70aae28e9d5aa8c0467385f0ba9173bed9bbca622b29f2201ff7deafeffffff4bfcb2bd592b5d020b19a0d4dfa228755b371a37fd5588c07f595801ddff312e020000006a473044022036358b208675213bfa877eaef15e46a81448cf3eb61bfa9f6cff437ff830459b02204beed7b1825f7ec7353c464f2513d7d005f60ba7e0e77029f6dbf060645fa101012102387314e87750ba96fe87fff13b3c4734c9a08e49451adbfeaa469e6918db6b68feffffff591e1e3fc835e0909950c025030b2412a88c993364a1300d1acd63d43916ee68030000006b483045022100aa08a617858c29fe3bb80795cb7e3e0fb2fe99ea28077c430ae5770b48f470ec022004b79a5fe2651953868eb2002f1a3fa5634119dcd1263a552bb9118046707771012102185bc8465acbcaec9c51c2268a35324f3a29f1d92d9e5b19d55d7f911f01e264feffffff600441319dd5a3c05f7db1d6ced3524d53187cdedcecf7952e496b7347ed5087000000006b483045022100f5707f107ad9f42723f67578fde0cef7cd87425fb8b4340268309675be64c77b0220008f1319ff3b3ecac94c5bc83610640c4dbf9961bd3eca8a21c757f21eede72e012102b9fb33db5ebc919cb86a14f58d0fd03388bf0d2bcf8c86fd8d0b7966a7369f37feffffff622d856a4fca2dc00ee1a7e4d2242580258240009d75ebb062a0a95e43391b78000000006a4730440220447113ca49efe66c99b6a957651f937aab7e4e6d63ce813c3595ddb3405a1e2902201fa735e521befcdc9720c5cfbcb2c0ff4963fd66d0f3cbccc874876e279db04201210336e1f1df7e125e6ccfffce85cbe4e2861b57c578abae362313b567e434a017c6feffffff72525081d702ee75bdcce64be23ad40465a8fbbc6e68cf2dabac96c9682673f9000000006b483045022100bb032db58baf4302a53790be8d44255365a9f80838f941c35f427550ba01417e022079042c1540fde0f93d7136812710d0bbb4ac679ba811c152572954263835555d01210384d74244814a63e864cb68a268bf47b429d75c2a0e6111e5f42f46c923e29af0feffffff93c2c593e8a91c361e9c58df609fb3bd9ddab4e6dcf4d1cf32e725e848efbe00010000006a47304402200e5050cea3bf7eefa33c02f3cae4150b2693cc0d3bfef802a80ac3262b72314402205eee94e45ec61c87eca13e0c77648ff259ee0ec54ba580a53ea8fc5f0e2acc2201210291c7886129eaf54db4b6671604afa1f322315c19d3471e0937b75ab93c40d4f2feffffff947bb38a8d4c92800aef76e549de4df67f8c754b3790d9eb9c3e264be194e2c3010000006a47304402207a25be7c9a939179e79898daed234920fa303b2e27da2e0e1b3f60665522fc50022062f9db2b6495a4428e25b8c5bd0fff7e4224dd0486c4eaf609329184121df4ac0121021d8e5ac784dea697199d1bb1dfd0c4ea85886bc0d1b74744397e1cf7588ae9defeffffffc58f2e75d1a7208072fdce78e2fb0f45ce23d47dae06d419e47772ebb83eb435000000006b483045022100b682b99a2bb23091e2a9c834c9a3106e76af64080e660e2c09d68761c1652d6702200af765c39afa11c2e9517c5b1c44cc7b1fc76ba0b91f5622f30de15ed3a7ebce012103902e4e2b60eed5cddfb403641ae477459dd19f6f072a0e78da8694e79e6a7360feffffffcc312f8f96e99cdc5f200ece94d4716e3e6010625c02b5e8545c918c2dea3f3c000000006b483045022100b424ddf64eee374bede2d8bea8b68a4de7813f05c59866503c982c478a7cc91602203b38b058f67cdcca987c76d3c9095cb4709fc37dd573da2d84adf9b2de2f6015012102834dd20ac782d950c93de34111c256e1aebc60a2465b2f21e74ac85c980b7de7feffffffd210e226e75c15aaded9493dbe3b8bde98061a98a912fcf70d1bd4e344fba858010000006b483045022100e17be8c76c19c76d04b373a3234541078511e8b7d49586e9daaa19fc57f7fe97022010ec77f6186fcb0340b61ce584ffa0019d0cbc88f038caa8bdbadc848e08e591012103c64f07faae09825da53adafc980ab3f3b4fdda4a33519af5e9f595edb8fb7cf3feffffffdf1633b493ce1ac62fe476bca3bd96789d9fea663cd1b1f030af23dbba0ba9c7130000006b483045022100ebf9d6b459c7612ff027004e2779b8b756f799f4371eb1e848d8bc5da83c3b8102207aa097a7c351830d2f846d07124a0db138470b1586afdce29725a37866ca48a70121031c8b16f6def96afb1c1eac9fc18b1769fd3520eb20ab79f50c215dcdbdba2785fefffffff29c32508396503fc249ae029e4723996ac50a79ce70adf654ed4f24149eebb9000000006a473044022033a4d458d57287a764ebff7f974b5777dda3a17b3d82fc3c2f3fc1e413d59d5702201f05ed836fc2de9740d16d45cc0b0acfe7d9e15020de6ecee5f537a95496525b012103a685de2ae82eb959658830716e81edb61716a3f01e38a88814363022fbc1c379feffffff02d4a6c935000000001976a914e8cea30989bd15530f819b766684b00dc7ba7cfa88ac912f0a00000000001976a914ee52f62a6f325cf587d5f2b5187d2d6f977827ca88ac7af40700";

        const extractInputTxids = await relay.extractInputTxids(rawtx);

        /*
        let validateTxChainTransaction = await debug(relay.validateTxChainTransaction(rawtx, txids));

        truffleAssert.eventEmitted(validateTxChainTransaction, 'CheckTxChainProof', (ev) => {
            return ev.txids == txids;
        });
        */
        console.log("Total gas used: " + extractInputTxids.receipt.gasUsed);
    });
});
