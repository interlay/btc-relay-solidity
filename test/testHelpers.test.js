const BTCRelay = artifacts.require("./BTCRelay.sol")
const Utils = artifacts.require("./Utils.sol")

const constants = require("./constants")
const helpers = require('./helpers');
const truffleAssert = require('truffle-assertions');

const testdata = require('./testdata/blocks.json')


var dblSha256Flip = helpers.dblSha256Flip
var flipBytes = helpers.flipBytes

contract('BTCRelay helper functions', async(accounts) => {

    beforeEach('(re)deploy contracts', async function (){ 
        relay = await BTCRelay.new();
        utils = await Utils.deployed();
    });

    it('blockHash from header', async () => {
        // should convert LE to BE representation        
        let hashValue = await relay.blockHashFromHeader("0x0000002093ca64158287d362f3304f8279a9a40c51cfac9466af120000000000000000009dd6aca8ff633eaa81fa5a6a861877bde0648ad5c7e64b7245720b4b9a0990c07745955d240f161701c168c8");
        assert.equal(hashValue, '0x000000000000000000050db24a549b7b9dbbc9de1f44cd94e82cc6863b4f4fc0');
    });


    it("concat sha256 hash", async () => {
        left = "0x544deaa14ea4ba4e78707035de132ab927ea671edd3f07b9028bea5f264b5752"
        right = "0x99a76a9aa39ad6a3c1fecc1d557650a69ebddb7c50dcb867cffafcc54eeacc2f"
        root = "0xd8ac16fff73a56a00af00ca4d1a74a3e048730136e3dea6b32468a8d1004150c"
        let concatHash = await relay.concatSHA256Hash(left, right)
        
        assert.equal(concatHash, flipBytes(root))
    });

    it("compute merkle", async () => {
        block1 = testdata[2]    
        tx = block1["tx"][0]

        let merkleRoot = await relay.computeMerkle(tx["tx_index"], tx["merklePath"])
        
        assert.equal(merkleRoot, flipBytes(block1["merkleroot"]))
    });

});