import type { FromClientMessage, JoinMessage } from "@automerge/automerge-repo-network-websocket";

export type HackendJWTPayload = { uid: string, email: string };
export type HackendJoinMessage = JoinMessage & { token: string };
export type HackendFromClientMessage = Exclude<FromClientMessage, JoinMessage> | HackendJoinMessage;
export type ProjectData = {
    id: string,
    meta: any,
    doc: any
};