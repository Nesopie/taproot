import { sha256, taggedHash } from "bitcoinjs-lib/src/crypto";
import { LEAF_VERSION, TAP_BRANCH, TAP_LEAF, TAP_TWEAK } from "./constants";
import { createHashlock, createTimelock } from "./script";
import * as ecc from "tiny-secp256k1";
import { fromBech32 } from "bitcoinjs-lib/src/address";
import * as bitcoin from "bitcoinjs-lib";

export const serializeScript = (script: Buffer) => {
    return Buffer.concat([
        LEAF_VERSION,
        Buffer.from(script.byteLength.toString(16), "hex"), // add compact size encoding later
        script,
    ]);
};

export const createTapTree = (scripts: Buffer[]) => {
    let currentLevel = scripts.map((script) =>
        taggedHash(TAP_LEAF, serializeScript(script))
    );

    while (currentLevel.length != 1) {
        let nextLevel = [] as Buffer[];
        const maxNodes = Math.pow(
            2,
            Math.floor(Math.log2(currentLevel.length))
        );
        for (let i = 0; i < maxNodes; i += 2) {
            const [smaller, bigger] = currentLevel
                .slice(i, i + 2)
                .sort((a, b) => a.compare(b));

            nextLevel.push(
                taggedHash(TAP_BRANCH, Buffer.concat([smaller, bigger]))
            );
        }
        currentLevel = [...nextLevel, ...currentLevel.slice(maxNodes)];
    }

    return currentLevel;
};

export const generateExternalKey = (
    evmAddress: string,
    user: Buffer,
    enablers: Buffer[],
    secretHashes: Buffer[],
    timelock: Buffer
) => {
    if (enablers.length !== secretHashes.length) {
        console.log("Invalid number of enablers / secretHashes");
        return;
    }

    const hashlockScipts = enablers.map((enabler, i) =>
        createHashlock(secretHashes[i], enabler)
    );

    const timelockScript = createTimelock(timelock, user);

    const mastRoot = createTapTree([...hashlockScipts, timelockScript])[0];

    const evmAddressHash = sha256(
        Buffer.from(
            evmAddress.startsWith("0x") ? evmAddress.slice(2) : evmAddress,
            "hex"
        )
    );

    const internalPubKey = ecc.xOnlyPointFromScalar(evmAddressHash);

    const tweak = taggedHash(
        TAP_TWEAK,
        Buffer.concat([internalPubKey, mastRoot])
    );

    const tweakedPubKey = ecc.xOnlyPointAddTweak(internalPubKey, tweak);

    return tweakedPubKey;
};

export const generateMerkleProof = (scripts: Buffer[], index: number) => {
    if (index > scripts.length - 1) throw new Error("Invalid index");

    let currentLevel = scripts.map((script) =>
        taggedHash(TAP_LEAF, serializeScript(script))
    );

    const proofs = [] as Buffer[];

    while (currentLevel.length != 1) {
        let nextLevel = [] as Buffer[];
        if (index < currentLevel.length) {
            if (index % 2) proofs.push(currentLevel[index - 1]);
            else proofs.push(currentLevel[index + 1]);

            index = Math.floor(index / 2);
        }
        const maxNodes = Math.pow(
            2,
            Math.floor(Math.log2(currentLevel.length))
        );
        for (let i = 0; i < maxNodes; i += 2) {
            const [smaller, bigger] = currentLevel
                .slice(i, i + 2)
                .sort((a, b) => a.compare(b));

            nextLevel.push(
                taggedHash(TAP_BRANCH, Buffer.concat([smaller, bigger]))
            );
        }
        currentLevel = [...nextLevel, ...currentLevel.slice(maxNodes)];
    }

    return proofs;
};

export const computeMerkleProof = (leaf: Buffer, merkleProof: Buffer[]) => {
    const hash = taggedHash(TAP_LEAF, leaf);
    const proofHash = merkleProof.reduce(
        (acc, proof) =>
            taggedHash(
                TAP_BRANCH,
                Buffer.concat([acc, proof].sort((a, b) => a.compare(b)))
            ),
        hash
    );

    return proofHash;
};

const enablerAddress = "bc1q6ngglezrappslwz526z5vja42t8fg3tz3qyc4k";
const enabler = fromBech32(enablerAddress).data;

const secret = sha256(Buffer.from("secret", "utf8"));
const secretHash = sha256(secret);

const hashlock = createHashlock(secretHash, enabler);
const timelock = createTimelock(bitcoin.script.number.encode(2), enabler);

const script = [...Array(1600)].map(() => hashlock);

const taptree = createTapTree([...script, timelock]);

console.log("root", taptree[0]);

const merkleProof = generateMerkleProof([...script, timelock], 12);

console.log(merkleProof.length);

console.log(
    "root from merkle proof",
    computeMerkleProof(serializeScript(hashlock), merkleProof)
);
