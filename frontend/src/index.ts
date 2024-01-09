import _HackendProvider from "./queryclient";

export { init } from "./init";
export const HackendProvider = _HackendProvider;
export { sendLoginCode, login, logout, useSendLoginCode, useLogin, useUser } from "./auth";
export {
    newProject,
    updateProject,
    getProject,
    listProjects,
    deleteProject,
    newAlias,
    deleteAlias,
    listAliases,
    useNewProject,
    useUpdateProject,
    useGetProject,
    useDeleteProject,
    useNewAlias,
    useDeleteAlias,
    useListProjects,
    useListAliases
} from "./projects";
export { repo } from "./automerge/repo";
export { amExtension, useAMExtension, makeDispatchTransactions } from "./automerge/codemirror";