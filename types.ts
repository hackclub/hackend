import type { FromClientMessage } from "@automerge/automerge-repo-network-websocket";
import type { PeerId } from "@automerge/automerge-repo";

export type HackendJWTPayload = { uid: string, email: string };
export type HackendFromClientMessage = FromClientMessage | {
    type: "authenticate",
    senderId: PeerId,
    token: string
};