import _HackendProvider from "./queryclient";

export { init } from "./init";
export const HackendProvider = _HackendProvider;
export { sendLoginCode, login, logout, useSendLoginCode, useLogin, useUser } from "./auth";
export {
    newProject,
    getProject,
    deleteProject,
    newAlias,
    deleteAlias,
    listProjects,
    listAliases,
    useNewProject,
    useGetProject,
    useDeleteProject,
    useNewAlias,
    useDeleteAlias,
    useListProjects,
    useListAliases
} from "./projects";
export { repo } from "./automerge/repo";
export { amExtension, useAMExtension, makeDispatchTransactions } from "./automerge/codemirror";