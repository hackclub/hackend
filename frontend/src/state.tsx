import { createState } from "niue";
import { HackendJWTPayload } from "../../types";
import { init as repo_init } from "./automerge/repo";

type HackendState = {
    apiUrl: string | null,
    token: string | null,
    uid: string | null,
    currentDoc: string | null
};

export const [useHackendState, patchHackendState, getHackendState] = createState<HackendState>({
    apiUrl: null,
    token: null,
    uid: null,
    currentDoc: null
});

export const decodeJWT = (token: string): HackendJWTPayload & {
    iat: number;
    exp: number;
} => JSON.parse(atob(token.split(".")[1]));

export function init(api_url: string) {
    patchHackendState({ apiUrl: api_url });

    // try loading token, if it isn't expired (or less than 2 days from expiry)
    const token = localStorage.getItem("token");
    if (!token) return;
    const { exp, uid } = decodeJWT(token);
    if ((exp - 60 * 60 * 24 * 2) * 1000 < Date.now()) return;
    patchHackendState({ token, uid });

    repo_init();
}