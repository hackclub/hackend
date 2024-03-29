import { decodeJWT, getHackendState, patchHackendState, useHackendState } from "./state";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { hackendFetch } from "./request";

export async function sendLoginCode(email: string) {
    const res = await hackendFetch({
        endpoint: "/auth/send_login_code",
        method: "POST",
        body: { email }
    });
    const uid = await res.text();
    patchHackendState({ uid });
    return uid;
}

export async function login(code: string) {
    const res = await hackendFetch({
        endpoint: "/auth/login",
        method: "POST",
        body: { uid: getHackendState().uid, code }
    });
    const token = await res.text();
    patchHackendState({ token });
    localStorage.setItem("token", token);
    return token;
}

export async function sendChangeEmailCode(new_email: string) {
    await hackendFetch({
        endpoint: "/auth/send_change_email_code",
        method: "POST",
        body: { new_email }
    });
}

export async function changeEmail(code: string) {
    await hackendFetch({
        endpoint: "/auth/change_email",
        method: "POST",
        body: { code }
    });
}

export function logout() {
    patchHackendState({ token: null, uid: null });
    localStorage.removeItem("token");
}

export const useSendLoginCode = () =>
    useMutation({
        mutationFn: sendLoginCode
    });

export const useLogin = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: login,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
    });
};

export const useUser = () => {
    const { token } = useHackendState(["token"]);
    return useMemo(() => {
        if(!token) return null;
        return decodeJWT(token);
    }, [token]);
};

export const useSendChangeEmailCode = () =>
    useMutation({
        mutationFn: sendChangeEmailCode
    });

export const useChangeEmail = () =>
    useMutation({
        mutationFn: changeEmail
    });