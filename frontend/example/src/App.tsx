import {
    useNewProject,
    useLogin,
    useSendLoginCode,
    useUser,
    repo,
    amExtension,
    useAMExtension,
    makeDispatchTransactions
} from "../../dist";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { basicSetup } from "codemirror";
import { AnyDocumentId, DocHandle } from "@automerge/automerge-repo";

function App() {
    const user = useUser();

    return (
        <>
            <p>User: <code>{JSON.stringify(user, null, 4)}</code></p>
            <LoginBox />
            {user && <Editor />}
        </>
    );
}

function LoginBox() {
    const { loading: codeLoading, error: codeError, mutate: codeMutate } = useSendLoginCode();
    const { loading: loginLoading, error: loginError, mutate: loginMutate } = useLogin();
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    return (
        <div>
            Login
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <button onClick={() => codeMutate(email)}>Send Code</button>
            {codeError && <p>{codeError.message}</p>}
            {codeLoading && <p>Loading...</p>}
            <input type="text" value={code} onChange={e => setCode(e.target.value)} />
            <button onClick={() => loginMutate(code)}>Login</button>
            {loginError && <p>{loginError.message}</p>}
            {loginLoading && <p>Loading...</p>}
        </div>
    );
}

function Editor() {
    const { loading, error, data, mutate } = useNewProject();
    const [docId, setDocId] = useState<string | null>(null);

    useEffect(() => {
        if(!data) return;
        setDocId(data);
    }, [data]);

    const handle = useMemo(() => {
        if(!docId) return;
        return repo.find(docId as AnyDocumentId);
    }, [docId]);

    return (
        <>
            <button onClick={() => mutate({ doc: "yeah!!" })}>new project</button><p>project id: {JSON.stringify(data)}</p>
            {error && <p>{error.message}</p>}
            {loading && <p>Loading...</p>}
            <button onClick={() => setDocId(prompt("doc id"))}>set doc id</button>
            <CodeMirror handle={handle} />
        </>
    )
}


const createCMState = () => EditorState.create({
    extensions: [
        basicSetup,
        amExtension
    ],
    doc: ""
});

function CodeMirror({ handle } : { handle: DocHandle<any> | undefined }) {
    const [view, setView] = useState<EditorView | null>(null);

    useAMExtension(view, handle, ["doc"]);

    const editorRef = useCallback((node: HTMLDivElement) => {
        if(!node) return;
        const view: EditorView = new EditorView({
            state: createCMState(),
            parent: node,
            dispatchTransactions: makeDispatchTransactions(() => view)
        });
        // @ts-expect-error
        node["view"] = view;
        setView(view);
    }, []);

    return (
        <div ref={editorRef} />
    )
}

export default App;
