import { getHackendState, patchHackendState } from "./state";
import { HackendJWTPayload } from "../../auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const requestHeaders = (token?: string) => ({
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
});

const decodeJWT = (token: string) : HackendJWTPayload & {
    iat: number;
    exp: number;
} => JSON.parse(atob(token.split(".")[1]));

// TODO: token expiration
async function hackendFetch({ endpoint, method, body, token } : { endpoint: string, method: string, body?: any, token?: string }) {
    const res = await fetch(getHackendState().api_url + endpoint, {
        method,
        headers: requestHeaders(token),
        body: body ? JSON.stringify(body) : undefined
    });
    if(!res.ok) throw new Error(await res.text());
    return res;
}

export async function doSendLoginCode(email: string) {
    const res = await hackendFetch({
        endpoint: "/auth/send_login_code",
        method: "POST",
        body: { email }
    });
    const uid = await res.text();
    patchHackendState({ uid });
    return uid;
}

export async function doLogin({ uid, code }: { uid: string, code: string }) {
    const res = await hackendFetch({
        endpoint: "/auth/login",
        method: "POST",
        body: { uid, code }
    });
    const token = await res.text();
    patchHackendState({ token });
    return token;
}

export const useSendLoginCode = () =>
    useMutation({
        mutationFn: doSendLoginCode
    });

export const useLogin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: doLogin,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [] }); // TODO
        }
    });
};