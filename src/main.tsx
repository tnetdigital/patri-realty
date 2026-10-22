import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
} from "@tanstack/react-query";
import { AuthProvider } from "./features/auth/context";
import App from "./pages/App";
import "./styles.css";
import "./premium.css";
import "./mobile.css";
const state = (
  window as unknown as {
    __PATRI_STATE__?: import("@tanstack/react-query").DehydratedState;
  }
).__PATRI_STATE__;
const tree = (
  <React.StrictMode>
    <QueryClientProvider client={new QueryClient()}>
      <BrowserRouter>
        <AuthProvider>
          <HydrationBoundary state={state}>
            <App />
          </HydrationBoundary>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
if (state) ReactDOM.hydrateRoot(document.getElementById("root")!, tree);
else ReactDOM.createRoot(document.getElementById("root")!).render(tree);
