import { Chunk, StorageAdapter, StorageKey } from "@automerge/automerge-repo";
import { eq, like } from "drizzle-orm";
import { db } from "../db/client.js";
import { automerge_storage } from "../db/schema.js";

const KEY_SEPARATOR = "::";
const string_of_storage_key = (key: StorageKey) => key.join(KEY_SEPARATOR);
const storage_key_of_string = (key: string) => key.split(KEY_SEPARATOR);

export class DbAdapter extends StorageAdapter {
    async load(key: StorageKey): Promise<Uint8Array | undefined> {
        const result = await db.select().from(automerge_storage)
            .where(eq(automerge_storage.keys, string_of_storage_key(key))).limit(1);
        return result.length === 1 ? Uint8Array.from(result[0].data) : undefined;
    }

    async save(key: StorageKey, data: Uint8Array): Promise<void> {
        await db.insert(automerge_storage).values({
            keys: string_of_storage_key(key),
            data: Buffer.from(data)
        });
    }

    async remove(key: StorageKey): Promise<void> {
        await db.delete(automerge_storage)
            .where(eq(automerge_storage.keys, string_of_storage_key(key)));
    }

    async loadRange(keyPrefix: StorageKey): Promise<Chunk[]> {
        return (await db.select().from(automerge_storage)
            .where(like(automerge_storage.keys, string_of_storage_key(keyPrefix) + "%")))
            .map(({ keys, data }) =>
                ({ key: storage_key_of_string(keys), data: Uint8Array.from(data)}));
    }

    async removeRange(keyPrefix: StorageKey): Promise<void> {
        await db.delete(automerge_storage)
            .where(like(automerge_storage.keys, string_of_storage_key(keyPrefix) + "%"));
    }
}
