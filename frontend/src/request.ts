import { getHackendState } from "./state";

const requestHeaders = (token?: string | null) => ({
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` })
});

export async function hackendFetch({ endpoint, method, body }: {
    endpoint: string,
    method: string,
    body?: any
}) {
    const res = await fetch(getHackendState().apiUrl + endpoint, {
        method,
        headers: requestHeaders(getHackendState().token),
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) throw new Error(await res.text());
    return res;
}