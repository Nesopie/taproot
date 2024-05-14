import { sha256 } from "bitcoinjs-lib/src/crypto";
import { createHashlock, createTimelock } from "./script";
import { fromBech32, toBech32 } from "bitcoinjs-lib/src/address";
import * as bitcoin from "bitcoinjs-lib";
import { createTapTree } from "./taproot";
import { ECPairFactory } from "ecpair";
import { initEccLib } from "bitcoinjs-lib";

import * as ecc from "tiny-secp256k1";
import { taggedHash } from "./utils";
import { TAP_TWEAK } from "./constants";

initEccLib(ecc);

const ECPair = ECPairFactory(ecc);

const evmAddress = "f39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();
const evmAddressHash = sha256(Buffer.from(evmAddress, "hex"));

const internalPubKey = ecc.xOnlyPointFromScalar(evmAddressHash);

const enablerAddress = "bc1q6ngglezrappslwz526z5vja42t8fg3tz3qyc4k";
const enabler = fromBech32(enablerAddress).data;

const secret = sha256(Buffer.from("secret", "utf8"));
const secretHash = sha256(secret);

const hashlock = createHashlock(secretHash, enabler);
const timelock = createTimelock(bitcoin.script.number.encode(2), enabler);

const taptree = createTapTree([
    hashlock,
    hashlock,
    hashlock,
    hashlock,
    timelock,
]);
const tweak = taggedHash(
    TAP_TWEAK,
    Buffer.concat([internalPubKey, taptree[0]])
);

const tweakedPubKey = ecc.xOnlyPointAddTweak(internalPubKey, tweak);
console.log(toBech32(Buffer.from(tweakedPubKey?.xOnlyPubkey!), 1, "bcrt"));

//--------------------------------------------

const p2tr = bitcoin.payments.p2tr({
    internalPubkey: Buffer.from(internalPubKey),
    scriptTree: [
        [
            [{ output: hashlock }, { output: hashlock }],
            [{ output: hashlock }, { output: hashlock }],
        ],
        {
            output: timelock,
        },
    ],
    network: bitcoin.networks.regtest,
});

console.log(p2tr.address);
// console.log(fromBech32(p2tr.address as string).data);
