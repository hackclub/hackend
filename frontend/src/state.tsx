import React from "react";
import { createState } from "niue";
import { HackendJWTPayload } from "../../auth";

type HackendState = {
    api_url: string | null,
    token: string | null,
    uid: string | null
};

export const [useHackendState, patchHackendState, getHackendState] = createState<HackendState>({
    api_url: null,
    token: null,
    uid: null
});

export function initHackend(api_url: string) {
    patchHackendState({ api_url });
}