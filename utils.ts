import * as crypto from "crypto";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";

const ECPair = ECPairFactory(ecc);

export const taggedHash = (tag: string, data: Buffer) => {
    const tagHash = crypto.createHash("sha256").update(tag).digest();
    return sha256(Buffer.concat([tagHash, tagHash, data]));
};

export const sha256 = (buffer: Buffer): Buffer => {
    return crypto.createHash("sha256").update(buffer).digest();
};

export const signerFromPk = (
    privateKey: string,
    network: bitcoin.networks.Network
) => {
    const buf = Buffer.from(privateKey, "hex");
    if (buf.length === 0) {
        throw new Error("invalid private key");
    }

    return ECPair.fromPrivateKey(buf, {
        network,
    });
};
