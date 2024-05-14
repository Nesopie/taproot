import * as bitcoin from "bitcoinjs-lib";

/**
 * Calculates the hash lock script based on the secret hash and minter BTC address.
 *
 * @param {Buffer} secretHash - The secret hash used in the hashlock script.
 * @param {Buffer} enabler - The enabler's public key hash.
 * @return {Buffer} This function does not return a value.
 */
export const createHashlock = (secretHash: Buffer, enabler: Buffer): Buffer => {
    const script = bitcoin.script.compile([
        bitcoin.script.OPS.OP_SHA256,
        secretHash,
        bitcoin.script.OPS.OP_EQUALVERIFY,
        bitcoin.script.OPS.OP_DUP,
        bitcoin.script.OPS.OP_HASH160,
        enabler,
        bitcoin.script.OPS.OP_EQUALVERIFY,
        bitcoin.script.OPS.OP_CHECKSIG,
    ]);

    return script;
};

/**
 * Generates a time lock script using the provided time lock and user.
 *
 * @param {Buffer} timeLock - The time lock value.
 * @param {Buffer} user - The user's public key hash.
 * @return {Buffer} The generated time lock script.
 */
export const createTimelock = (timeLock: Buffer, user: Buffer) => {
    const script = bitcoin.script.compile([
        bitcoin.script.number.encode(2),
        bitcoin.script.OPS.OP_CHECKSEQUENCEVERIFY,
        bitcoin.script.OPS.OP_DROP,
        bitcoin.script.OPS.OP_DUP,
        bitcoin.script.OPS.OP_HASH160,
        user,
        bitcoin.script.OPS.OP_EQUALVERIFY,
        bitcoin.script.OPS.OP_CHECKSIG,
    ]);

    return script;
};
