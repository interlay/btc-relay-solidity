const createHash = require('create-hash')
var reverse = require('buffer-reverse')

module.exports = {
    eventFired: function (transaction, eventName) {
        for (var i = 0; i < transaction.logs.length; i++) {
            var log = transaction.logs[i];
            if (log.event == eventName) {
                // We found the event!
                assert.isTrue(true);
            }
            else {
                assert.isTrue(false, "Did not find " + eventName);
            }
        }
    },
    // Expecting leading "0x"
    dblSha256Flip: function dblSha256Flip(blockHeader){
        var buffer = Buffer.from(blockHeader.substr(2), "hex")
        return "0x" + reverse(module.exports.sha256(module.exports.sha256(buffer))).toString("hex")
    },
    sha256: function sha256(buffer) {
        return createHash('sha256').update(buffer).digest();
    },
    // Expecting leading "0x"
    flipBytes: function flipBytes(hexString){
        var buffer = Buffer.from(hexString.substr(2), "hex");
        return "0x" + reverse(buffer).toString("hex")
    },
    nBitsToTarget: function nBitsToTarget(nBits){
        var exp = uint256(nBits) >> 24;
        var c = uint256(nBits) & 0xffffff;
        var target = uint256((c * 2**(8*(exp - 3))));
        return target;
    }

};
