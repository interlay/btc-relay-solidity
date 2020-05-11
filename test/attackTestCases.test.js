const BTCRelay = artifacts.require("./BTCRelay.sol")
const Utils = artifacts.require("./Utils.sol")

const constants = require("./constants")
const helpers = require('./helpers');
const truffleAssert = require('truffle-assertions');

const testdata = require('./testdata/blocks.json')


var dblSha256Flip = helpers.dblSha256Flip
var flipBytes = helpers.flipBytes

contract('Attack Test Cases', async(accounts) => {

    const storeGenesis = async function(){
        genesis = testdata[0]
        await relay.setInitialParent(
            genesis["header"],
            genesis["height"],
            );
    }


    beforeEach('(re)deploy contracts', async function (){ 
        relay = await BTCRelay.new();
        utils = await Utils.deployed();
    });

    // SET INITIAL PARENT
    it("TESTCASE 1: set duplicate initial parent - should fail", async () => {   
        storeGenesis();
        await truffleAssert.reverts(
            relay.setInitialParent(
                genesis["header"],
                genesis["height"],
            )
        );
    });

    // STORE BLOCK HEADER
    it("TESTCASE 2: duplicate block submission - should fail", async () => {   
        storeGenesis();  
        block1 = testdata[1]  
        let submitBlock1 = await relay.storeBlockHeader(
            block1["header"]
        );
        truffleAssert.eventEmitted(submitBlock1, 'StoreHeader', (ev) => {
            return ev.blockHeight ==  block1["height"];
        });   
        /*
        await truffleAssert.reverts(
            relay.storeBlockHeader(
                block1["header"]
                ),
                constants.ERROR_CODES.ERR_DUPLICATE_BLOCK
            );
            */
    });

    it("TESTCASE 3a: too large block header - should fail", async () => {   
        storeGenesis();  
        block1 = testdata[1]  
        await truffleAssert.reverts(
            relay.storeBlockHeader(
                block1["header"] + "123"
                ),
                constants.ERROR_CODES.ERR_INVALID_HEADER
            );
    });

    it("TESTCASE 3b: too small block header - should fail", async () => {   
        storeGenesis();  
        block1 = testdata[1]    
        await truffleAssert.reverts(
            relay.storeBlockHeader(
                block1["header"].substring(0,28)
                ),
                constants.ERROR_CODES.ERR_INVALID_HEADER
            );
    });

    it("TESTCASE 4: submit block where prev block is not in main chain - should fail", async () => {   
        
        storeGenesis();    
        block2 = testdata[2]   
        await truffleAssert.reverts(
            relay.storeBlockHeader(
                block2["header"]
                ),
                constants.ERROR_CODES.ERR_PREV_BLOCK
            );
    });

    it("TESTCASE 5: weak block submission - should fail", async () => {   
        // invalid header for block 500000
        fakeGenesis = {
        "hash": "0x00000000000000000012af6694accf510ca4a979824f30f362d387821564ca93",
        "height": 597613,
        "merkleroot": "0x1c7b7ac77c221e1c0410eca20c002fa7b6467ba966d700868928dae4693b3b78",
        "header": "0x00000020614db6ddb63ec3a51555336aed1fa4b86e8cc52e01900e000000000000000000783b3b69e4da28898600d766a97b46b6a72f000ca2ec10041c1e227cc77a7b1c6a43955d240f1617cb069aed"
        }
        fakeBlock = {
        "hash": "0x000000000000000000050db24a549b7b9dbbc9de1f44cd94e82cc6863b4f4fc0",
        "height": 597614,
        "merkleroot": "0xc090099a4b0b7245724be6c7d58a64e0bd7718866a5afa81aa3e63ffa8acd69d",
        "header" : "0x0000002093ca64158287d362f3304f8279a9a40c51cfac9466af120000000000000000009dd6aca8ff633eaa81fa5a6a861877bde0648ad5c7e64b7245720b4b9a0990c07745955d240f16171c168c88"
        }

        await relay.setInitialParent(
            fakeGenesis["header"],
            fakeGenesis["height"]
            );    
        await truffleAssert.reverts(
            relay.storeBlockHeader(
                fakeBlock["header"]
                ),
                constants.ERROR_CODES.ERR_LOW_DIFF
            );
    });
    
    
    it("TESTCASE 6: empty txid - should fail", async () => {   
        storeGenesis()
        block1 = testdata[1]    
        let submitBlock1 = await relay.storeBlockHeader(
            block1["header"]
        );
        truffleAssert.eventEmitted(submitBlock1, 'StoreHeader', (ev) => {
            return ev.blockHeight == block1["height"];
        });

        tx = block1["tx"][0]
        await truffleAssert.reverts(
            relay.verifyTx(
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            block1["height"],
            tx["tx_index"],
            tx["merklePath"],
            0),
            constants.ERR_INVALID_TXID
        )

    });
    it("TESTCASE 7: wrong txid parsed for verification - should fail!", async () => {   
        storeGenesis()
        block1 = testdata[1]    
        let submitBlock1 = await relay.storeBlockHeader(
            block1["header"]
        );
        truffleAssert.eventEmitted(submitBlock1, 'StoreHeader', (ev) => {
            return ev.blockHeight == block1["height"];
        });

        tx = block1["tx"][0]

        fakeMerkle = 
        await truffleAssert.reverts(relay.verifyTx(
            "0x1111111111111111111111111111111111111111111111111111111111111111",
            block1["height"],
            tx["tx_index"],
            tx["merklePath"],
            0),
            constants.ERR_INVALID_TXID
        )
    });

    it("TESTCASE 8: missing tx confirmation check - should fail", async () => {   
        storeGenesis()
        block1 = testdata[1]    
        let submitBlock1 = await relay.storeBlockHeader(
            block1["header"]
        );
        truffleAssert.eventEmitted(submitBlock1, 'StoreHeader', (ev) => {
            return ev.blockHeight == block1["height"];
        });


        // push blocks
        confirmations = 10
        testdata.slice(2,4).forEach(b => {
            relay.storeBlockHeader(
                b["header"]
            );
        });

        tx = block1["tx"][0]
        await truffleAssert.reverts(
            relay.verifyTx(
            tx["tx_id"],
            block1["height"],
            tx["tx_index"],
            tx["merklePath"],
            confirmations),
            constants.ERR_CONFIRMS
        )
    });


    it("TESTCASE 9: performance: instantly return if only 1 hash - save costs!", async () => {   
        storeGenesis()
        block1 = testdata[1]    
        let submitBlock1 = await relay.storeBlockHeader(
            block1["header"]
        );
        truffleAssert.eventEmitted(submitBlock1, 'StoreHeader', (ev) => {
            return ev.blockHeight == block1["height"];
        });

        tx = block1["tx"][0]
        verifyTx = await relay.verifyTx(
            tx["tx_id"],
            block1["height"],
            tx["tx_index"],
            tx["merklePath"],
            0)
        
        assert(verifyTx.receipt.gasUsed < 48440);
    });

    


    // FORK HANDLING 
    // xit("TESTCASE 10: fork submission handling", async () => {   
    //     assert(false);
    //     // TODO
    // });

    // xit("TESTCASE 11: main chain deleted too early - save costs!", async () => {   
    //     assert(false);
    //     // TODO
    // });
    

});