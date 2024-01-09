import { init as repo_init } from "./automerge/repo";
import { decodeJWT, patchHackendState } from "./state";

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