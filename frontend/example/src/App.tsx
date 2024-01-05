import { useLogin, useSendLoginCode, useUser } from "../../dist";
import { useState } from "react";

function App() {
    const user = useUser();

    return (
        <>
            <p>User: <code>{JSON.stringify(user, null, 4)}</code></p>
            <LoginBox />
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

export default App;
