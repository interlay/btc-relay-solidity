const XCLAIM = artifacts.require("XCLAIM");
const Relay = artifacts.require("test_relays/ValidRelay.sol");
const InValidRelay = artifacts.require("test_relays/InValidRelay.sol");

const bs58 = require('bs58');
const truffleAssert = require('truffle-assertions');
const math = require('mathjs');


contract("confirmIssueTests", accounts => {

    var xclaim;
    var relay;

    // Standard test values
    let amountETH = 100;
    let amountBTC = 200000;
    let vaultId = 1;
    let userBTC = bs58.decode('16UjcYNBG9GTK4uq2f7yYEbuifqCzoLMGScG3f467Sd');

    let vaultAddress = bs58.decode('16UjcYNBG9GTK4uq2f7yYEbuifqCzoLMGScG3f467Ss');
    let ethCollateral = 1000000000000000000;
    let fee = 0;


    // This will reset the contract state between tests
    beforeEach(async function () {
        relay = await Relay.new();
        xclaim = await XCLAIM.new(relay.address);

        // Register a vault with default collateral and issue a single user the default amountBTC

        // Add vault with sufficient collateral
        let pubkey = hexToBytes("e20cf24f62878ad5da120bd1efe6bcd6b1e13ea3");
        let userpubkey = hexToBytes("e20cf24f62878ad5da120bd1efe6bcd6b1e13ea3")

        await xclaim.registerVault(vaultAddress, fee, pubkey,{ from: accounts[1], value: ethCollateral });

        // Issue ERC20 tokens to user
        await xclaim.requestIssue(amountBTC, vaultId, userBTC, userpubkey, { from: accounts[0] });
    });

    it("On successful issue the isc will emit a success for its issue event", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);

        truffleAssert.eventEmitted(event, 'ConfirmIssue', (ev) => {
            assert.equal(
                ev.success,
                true,
                "The outcome of the issue should be a success"
            )
            assert.equal(
                ev.confirmId,
                issueId,
                "The issueId should match"
            )
            assert.equal(
                ev.errorMsg,
                "",
                "There should be no error msg"
            )
            return true;
        });
    });

    it("Confirm issue fails confirming issue for a invalid requestIssueId", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000126a10486f772069732065766572796f6e652100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1100;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId,
            { from: accounts[4] });

        truffleAssert.eventEmitted(event, 'ConfirmIssue', (ev) => {
            assert.equal(
                ev.success,
                false,
                "Confirm should fail as issueID is invalid"
            )
            assert.equal(
                ev.confirmId,
                issueId,
                "The issueId should match"
            )
            assert.equal(
                ev.errorMsg,
                "error: no issue request for this sender",
                "There should be an error msg"
            )
            return true;
        });
    });

    it("On failed issue the isc will emit a failure for its issue event", async () => {
        relay = await InValidRelay.new();
        await XCLAIM.new(relay.address)
            .then(function (instance) {
                xclaim = instance;
            });

        // Register a vault with default collateral and issue a single user the default amountBTC

        let pubkey = hexToBytes("053496c1ea3d54d649ed54de490fda3425222440");
        let userpubkey = hexToBytes("e20cf24f62878ad5da120bd1efe6bcd6b1e13ea3")


        // Add vault with sufficient collateral
        await xclaim.registerVault(vaultAddress, fee, pubkey, { from: accounts[1], value: ethCollateral });

        // Issue ERC20 tokens to user
        await xclaim.requestIssue(amountBTC, vaultId, userBTC, userpubkey, { from: accounts[0] });

        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000126a10486f772069732065766572796f6e652100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);
        truffleAssert.eventEmitted(event, 'ConfirmIssue', (ev) => {
            assert.equal(
                ev.success,
                false,
                "The outcome of the issue should be a failure(==false)"
            )
            assert.equal(
                ev.confirmId,
                issueId,
                "The issue id should match"
            )
            assert.equal(
                ev.errorMsg,
                "error: failed validity",
                "The error message should say: 'Error: failed relay validity'"
            )
            return true;
        });
    });

    it("confirming an issue will fail if incorrect OP_RETURN data present", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013200000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);

        truffleAssert.eventEmitted(event, 'ConfirmIssue', (ev) => {
            assert.equal(
                ev.success,
                false,
                "The outcome of the issue should be a success"
            )
            return true;
        });
    });

    it("Confirm issue fails confirming issue for invalid funds sent", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0200000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");

        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId,
            { from: accounts[4] });

        truffleAssert.eventEmitted(event, 'ConfirmIssue', (ev) => {
            assert.equal(
                ev.success,
                false,
                "Confirm should fail as invalid funds in rawtx"
            )
            return true;
        });
    })

    it("Confirm issue fails confirming issue for invalid receiver of funds", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf23f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId,
            { from: accounts[4] });

        truffleAssert.eventEmitted(event, 'ConfirmIssue', (ev) => {
            assert.equal(
                ev.success,
                false,
                "Confirm should fail as invalid funds in rawtx"
            )
            return true;
        });
    })

    it("Confirm issue fails confirming issue for invalid OP_RETURN data", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013200000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId,
            { from: accounts[4] });

        truffleAssert.eventEmitted(event, 'ConfirmIssue', (ev) => {
            assert.equal(
                ev.success,
                false,
                "Confirm should fail as invalid OP_RETURN data"
            )
            return true;
        });
    })

    it("Confirming issue will update the amount of btc stored for a user in vault mapping", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);
        
        let tokens = await xclaim.getTokensStored(vaultId, accounts[0]);
        assert.equal(
            tokens,
            amountBTC,
            "The mapping of tokens stored for the user in vault should match that of request"
        )
    })

    it("Confirming issue will add vaultId to list of user vaultIds", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');

        let user = await xclaim.getUser(accounts[0]);
        assert.equal(
            user.vaultIds.length,
            0,
            "Initially the user will have no vaults stored in vaultIds list"
        )


        await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);
        
        user = await xclaim.getUser(accounts[0]);
        assert.equal(
            user.vaultIds[0],
            1,
            "The user should have vault with id 1 stored"
        )  
    })

    it("Confirming issue will add funds to the user account", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');

        let value = await xclaim.balanceOf(accounts[0]);
        assert.equal(
            value,
            0,
            "The user should begin with no funds"
        )

        await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);
        
        value = await xclaim.balanceOf(accounts[0]);
        assert.equal(
            value,
            amountBTC,
            "The number of tokens for the user should increase"
        )
    })

    it("Cancelling issue will check that only correct vault can cancel the issue", async () => {
        let issueId = 1;
        let event;
        await xclaim.setTimeOutTime(0);
        sleep(2000);

        try {
            event = await xclaim.cancelIssue(issueId, {from: accounts[0]})
        } catch (error) {
            assert.equal(
                error.toString(),
                "Error: Returned error: VM Exception while processing transaction: revert Only vault pertaining to issue may cancel the issue -- Reason given: Only vault pertaining to issue may cancel the issue.",
                "Error should match"
            )
        }
        
        try {
            event = await xclaim.cancelIssue(issueId, {from: accounts[1]})
        } catch (error) {
            assert.equal(
                error.toString(),
                "",
                "Should not error."
            )
        }   
    })

    it("Cancelling issue will only work for non completed issue", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');

        await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);

        try {
            event = await xclaim.cancelIssue(issueId, {from: accounts[1]})
        } catch (error) {
            assert.equal(
                error.toString(),
                "Error: Returned error: VM Exception while processing transaction: revert The issue should not already be completed -- Reason given: The issue should not already be completed.",
                "Should error"
            )
        }   
    })

    it("Cancelling issue will unlock reserved collateral in vault", async () => {
        await xclaim.setTimeOutTime(0);

        sleep(2000);

        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');

        let event;

        try {
            event = await xclaim.cancelIssue(issueId, {from: accounts[1]})
        } catch (error) {
            assert.equal(
                error.toString(),
                "",
                "Should not error"
            )
        }   

        event = await xclaim.getVaultFromId(vaultId);
        assert.equal(
            event.lockedBTC,
            0,
            "there should be no more locked btc in vault"
        )
        
    })

    it("Confirming issue checks that maxTime has not exceeded for issue", async () => {
        xclaim = await XCLAIM.new(relay.address);

        // Register a vault with default collateral and issue a single user the default amountBTC

        // Add vault with sufficient collateral
        let pubkey = hexToBytes("e20cf24f62878ad5da120bd1efe6bcd6b1e13ea3");
        let userpubkey = hexToBytes("e20cf24f62878ad5da120bd1efe6bcd6b1e13ea3")

        await xclaim.registerVault(vaultAddress, fee, pubkey,{ from: accounts[1], value: ethCollateral });
        
        // times out after 0 seconds
        await xclaim.setTimeOutTime(0);

        // Issue ERC20 tokens to user
        await xclaim.requestIssue(amountBTC, vaultId, userBTC, userpubkey, { from: accounts[0] });
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');

        sleep(1000);
        
        let error = "";

        try {
            await xclaim.confirmIssue(rawTransaction,
                transactionIndex,
                merkelSiblings,
                blockHash,
                issueId);
        } catch (e) {
            error = e;
        }
        assert.equal(
            error.toString(),
            "Error: Returned error: VM Exception while processing transaction: revert Max time has been passed to confirm issue -- Reason given: Max time has been passed to confirm issue.",
            "Should error as max time exceeded"
        )
    })

    it("Cancelling issue will only work if given time has been exceeded", async () => {
        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');

        let error = "";

        try {
            event = await xclaim.cancelIssue(issueId, {from: accounts[1]})
        } catch (e) {
            error = e;
        } 
        assert.equal(
            error.toString(),
            "Error: Returned error: VM Exception while processing transaction: revert The issue has not yet expired -- Reason given: The issue has not yet expired.",
            "Should error"
        )  
    })

    it("Sufficient funds transfered to vault on successful confirm issue", async () => {
        relay = await Relay.new();
        xclaim = await XCLAIM.new(relay.address);

        // Register a vault with default collateral and issue a single user the default amountBTC

        // Add vault with sufficient collateral
        let pubkey = hexToBytes("e20cf24f62878ad5da120bd1efe6bcd6b1e13ea3");
        let userpubkey = hexToBytes("e20cf24f62878ad5da120bd1efe6bcd6b1e13ea3")

        await xclaim.registerVault(vaultAddress, 10, pubkey,{ from: accounts[1], value: ethCollateral });

        

        // Issue ERC20 tokens to user
        await xclaim.requestIssue(amountBTC, vaultId, userBTC, userpubkey, { from: accounts[0], value: 10 });
        let prevUserBalance = await web3.eth.getBalance(accounts[1]);

        // bytes calldata rawTransaction
        let rawTransaction = hexToBytes("01000000017df4eee40fef1cf0ac17bb9e723489a078511d8b402b1063d00a5f42dd5fa97b010000006a4730440220779202bedffce6d14c1d3918215b46de57aa3efb873455b0697ab9002a6226d3022039d684012fa8c92d8fe100cb23ec7c07a0129a58b55e82e507c78484b1ef378f0121027137d153419cbfe555b69a17c862978afa56cc2562568cfbae842c47636991a4ffffffff02400d0300000000001976a914e20cf24f62878ad5da120bd1efe6bcd6b1e13ea388ac0000000000000000036a013100000000");
        // uint256 _transactionIndex,
        let transactionIndex = 1;
        // uint256[] calldata _merkelSibling,
        let merkelSiblings = [1, 2];
        // uint256 _redeemId
        let issueId = 1;
        // uint256 _blockHash
        let blockHash = parseInt('0x0000000000009b958a82c10');


        let event = await xclaim.confirmIssue(rawTransaction,
            transactionIndex,
            merkelSiblings,
            blockHash,
            issueId);

        

        vault = await xclaim.getVaultFromId(vaultId);

        // previousBalance + (BTCredeemed * exchange to GWEI * exchange to WEI)
        let correctBalance = math.add(math.bignumber(prevUserBalance), math.bignumber(10));
        let userBalance = math.bignumber(await web3.eth.getBalance(accounts[1]));
        assert.equal(
            userBalance.value,
            correctBalance.value,
            "Balance of user decreases: " + (+prevUserBalance) + " == " + userBalance
        )
    })



});
function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
    bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

// Convert a byte array to a hex string
function bytesToHex(bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return hex.join("");
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }