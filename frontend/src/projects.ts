import { hackendFetch } from "./request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectData } from "../../types";

export async function newProject(data: { initial: any, meta: any }) {
    const res = await hackendFetch({
        endpoint: "/projects/new",
        method: "POST",
        body: data
    });
    return await res.text();
}

export async function updateProject(data: { id: string, meta: any }) {
    await hackendFetch({
        endpoint: "/projects/update",
        method: "POST",
        body: data
    });
}

export async function getProject(id: string): Promise<ProjectData> {
    const res = await hackendFetch({
        endpoint: "/projects/get?id=" + encodeURIComponent(id),
        method: "GET"
    });
    return await res.json();
}

export async function listProjects(): Promise<Omit<ProjectData, "doc">[]> {
    const res = await hackendFetch({
        endpoint: "/projects/list",
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

export async function listAliases(id: string) {
    const res = await hackendFetch({
        endpoint: "/projects/list_aliases?id=" + encodeURIComponent(id),
        method: "GET"
    });
    return await res.json();
}

export const useNewProject = () =>
    useMutation({ mutationFn: newProject });

export const useUpdateProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateProject,
        onSuccess: async (_, { id }) => {
            await queryClient.invalidateQueries({ queryKey: ["projects"] });
            await queryClient.invalidateQueries({ queryKey: ["project", id] });
        }
    })
}

export const useGetProject = (id: string) =>
    useQuery({
        queryKey: ["project", id],
        queryFn: ({ queryKey }) => getProject(queryKey[1])
    });

export const useDeleteProject = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteProject,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["projects"] });
        }
    });
};

export const useNewAlias = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: newAlias,
        onSuccess: async (_, id) => {
            await queryClient.invalidateQueries({ queryKey: ["aliases", id] });
        }
    });
};

export const useDeleteAlias = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAlias,
        onSuccess: async (_, id) => {
            await queryClient.invalidateQueries({ queryKey: ["aliases", id] });
        }
    });
};

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