import { hackendFetch } from "./request";
import { useMutation, useQuery } from "@tanstack/react-query";

export async function newProject(initial: any) {
    const res = await hackendFetch({
        endpoint: "/projects/new",
        method: "POST",
        body: { initial }
    });
    return await res.text();
}

export async function getProject(id: string) {
    const res = await hackendFetch({
        endpoint: "/projects/get?id=" + encodeURIComponent(id),
        method: "GET"
    });
    return await res.json();
}

export async function deleteProject(id: string) {
    await hackendFetch({
        endpoint: "/projects/delete",
        method: "POST",
        body: { id }
    });
}

export async function newAlias(id: string) {
    const res = await hackendFetch({
        endpoint: "/projects/new_alias",
        method: "POST",
        body: { id }
    });
    return await res.text();
}

export async function deleteAlias(alias: string) {
    await hackendFetch({
        endpoint: "/projects/delete_alias",
        method: "POST",
        body: { alias }
    });
}

export async function listProjects() {
    const res = await hackendFetch({
        endpoint: "/projects/list",
        method: "GET"
    });
    return await res.json();
}

export async function listAliases(id: string) {
    const res = await hackendFetch({
        endpoint: "/projects/list_aliases?id=" + encodeURIComponent(id),
        method: "GET"
    });
    return await res.json();
}

export const useNewProject = () =>
    useMutation({ mutationFn: newProject });

export const useGetProject = (id: string) =>
    useQuery({
        queryKey: ["project", id],
        queryFn: ({ queryKey }) => getProject(queryKey[1])
    });

export const useDeleteProject = () =>
    useMutation({ mutationFn: deleteProject });

export const useNewAlias = () =>
    useMutation({ mutationFn: newAlias });

export const useDeleteAlias = () =>
    useMutation({ mutationFn: deleteAlias });

export const useListProjects = () =>
    useQuery({
        queryKey: ["projects"],
        queryFn: () => listProjects()
    });

export const useListAliases = (id: string) =>
    useQuery({
        queryKey: ["aliases", id],
        queryFn: ({ queryKey }) => listAliases(queryKey[1])
    });