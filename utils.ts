import * as crypto from "crypto";

export const taggedHash = (tag: string, data: Buffer) => {
    const tagHash = crypto.createHash("sha256").update(tag).digest();
    return sha256(Buffer.concat([tagHash, tagHash, data]));
};

export const sha256 = (buffer: Buffer): Buffer => {
    return crypto.createHash("sha256").update(buffer).digest();
};
