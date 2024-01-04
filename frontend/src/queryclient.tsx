import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const client = new QueryClient();

// when the page loads, we're going to check if the token expire in a couple days
// and if so, just get rid of it/pretend the user is logged out
// hopefully people aren't using this for 48 hours straight

export default function HackendProvider({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
}