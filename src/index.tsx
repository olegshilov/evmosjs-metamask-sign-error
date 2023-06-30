import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { WagmiProvider } from "./wagmi-provider";
import { ReactQueryProvider } from "./react-query-provider";
import { CosmosProvider } from "./cosmos-provider";

const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ReactQueryProvider withDevtools>
        <WagmiProvider isProduction={false}>
          <CosmosProvider>
            <App />
          </CosmosProvider>
        </WagmiProvider>
      </ReactQueryProvider>
    </StrictMode>
  );
}
