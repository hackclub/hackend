import { Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { HackendBrowserWSClientAdapter } from "./network";
import { getHackendState } from "../state";

export let repo: Repo;

export function init() {
    const httpUrl = getHackendState().apiUrl;
    if(!httpUrl) throw new Error("Hackend API URL must be set before initializing automerge repo");
    // parse url and change protocol
    const url = new URL(httpUrl);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    repo = new Repo({
        network: [new HackendBrowserWSClientAdapter(url.toString())],
        storage: new IndexedDBStorageAdapter()
    });
}