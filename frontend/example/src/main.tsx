import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HackendProvider, init } from "../../dist";

init("http://localhost:3000");

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <HackendProvider>
            <App />
        </HackendProvider>
    </React.StrictMode>
);
