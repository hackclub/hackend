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