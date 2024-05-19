import { hash160, sha256 } from "bitcoinjs-lib/src/crypto";
import { createHashlock, createTimelock } from "./script";
import { fromBech32, toBech32 } from "bitcoinjs-lib/src/address";
import * as bitcoin from "bitcoinjs-lib";
import { generateExternalKey, generateMerkleProof } from "./taproot";
import { initEccLib } from "bitcoinjs-lib";
import {
    AddressType,
    BitcoinNetwork,
    BitcoinProvider,
    BitcoinWallet,
    generateMnemonic,
    mnemonicToPrivateKey,
} from "@catalogfi/wallets";

import * as ecc from "tiny-secp256k1";
import { signerFromPk } from "./utils";

initEccLib(ecc);

const network = BitcoinNetwork.Regtest;
const bitcoinNetwork = bitcoin.networks.regtest;

const evmAddress = "f39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();
const evmAddressHash = sha256(Buffer.from(evmAddress, "hex"));

const enablerAddress = "bc1q6ngglezrappslwz526z5vja42t8fg3tz3qyc4k";

const secret = sha256(Buffer.from("secret", "utf8"));
const secretHash = sha256(secret);

const mnemonic =
    "jazz social color pattern physical alter unable humble click decrease donate glory";
const privateKey = mnemonicToPrivateKey(mnemonic, network);

const bitcoinProvider = new BitcoinProvider(
    BitcoinNetwork.Regtest,
    "http://localhost:30000"
);

const wallet = BitcoinWallet.fromPrivateKey(
    privateKey,
    AddressType.p2wpkh,
    "m/84'/0'/0'",
    bitcoinProvider
);

const signer = signerFromPk(privateKey, bitcoinNetwork);

// const hashlock = createHashlock(secretHash, enabler);
// const timelock = createTimelock(bitcoin.script.number.encode(2), enabler);

// const taptree = createTapTree([
//     hashlock,
//     hashlock,
//     hashlock,
//     hashlock,
//     timelock,
// ]);
// const tweak = taggedHash(
//     TAP_TWEAK,
//     Buffer.concat([internalPubKey, taptree[0]])
// );

// const tweakedPubKey = ecc.xOnlyPointAddTweak(internalPubKey, tweak);

(async () => {
    const pubkey = Buffer.from(await wallet.getPublicKey(), "hex").subarray(1);
    const pubkeyhash = hash160(pubkey);
    const { tweakedPubKey, internalPubKey } = generateExternalKey(
        evmAddress,
        pubkeyhash,
        [pubkeyhash],
        [secretHash],
        bitcoin.script.number.encode(2)
    )!;

    const hashlockScript = createHashlock(secretHash, pubkeyhash);

    const timelockScript = createTimelock(
        bitcoin.script.number.encode(2),
        pubkeyhash
    );

    const taprootAddress = toBech32(
        Buffer.from(tweakedPubKey!.xOnlyPubkey),
        1,
        "bcrt"
    );

    const txid = await wallet.send(taprootAddress, 1000, 500);

    console.log(
        "funding txid",
        txid,
        Buffer.from(txid, "hex").reverse().toString("hex")
    );
    const tx = new bitcoin.Transaction();

    tx.version = 2;

    tx.addInput(Buffer.from(txid, "hex").reverse(), 0);

    const scriptBalance = await bitcoinProvider.getBalance(taprootAddress);

    tx.addOutput(
        bitcoin.address.toOutputScript(
            await wallet.getAddress(),
            bitcoinNetwork
        ),
        1000 - 500
    );

    const hashtype = bitcoin.Transaction.SIGHASH_DEFAULT;

    const hash = tx.hashForWitnessV1(
        0,
        [bitcoin.address.toOutputScript(taprootAddress, bitcoinNetwork)],
        [1000],
        hashtype
    );

    const signature = ecc.signSchnorr(hash, Buffer.from(privateKey, "hex"));

    const merkleProof = generateMerkleProof(
        [hashlockScript, timelockScript],
        0
    );

    tx.setWitness(0, [
        Buffer.from(signature),
        pubkey,
        secret,
        hashlockScript,
        Buffer.concat([
            Buffer.from((0xc0 + tweakedPubKey!.parity).toString(16), "hex"),
            internalPubKey,
            ...merkleProof,
        ]),
    ]);

    // const mastRoot = computeMerkleProof(
    //     serializeScript(hashlockScript),
    //     merkleProof
    // );

    // console.log("2 mastroot", mastRoot);

    // console.log(tweakedPubKey?.xOnlyPubkey);

    // console.log(
    //     ecc.xOnlyPointAddTweak(
    //         internalPubKey,
    //         taggedHash(TAP_TWEAK, Buffer.concat([internalPubKey, mastRoot]))
    //     )
    // );

    const hex = tx.toHex();

    console.log(hex);

    const txid2 = await bitcoinProvider.broadcast(hex);

    console.log(txid2);
})();
