import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import App from "./App.jsx";
import { setupI18n } from "./i18n";
import { translateError } from "./i18n/translateError";
import { useAuthStore } from "./store/authStore";
import "./index.css";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error?.status === 401) return;
      toast.error(translateError(error), { id: error?.code || "query-error" });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const { user } = useAuthStore.getState();

await setupI18n(user?.locale || user?.institution?.locale);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: user?.institution?.currencyCode || "USD",
      }}
    >
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-right" />
      </QueryClientProvider>
    </PayPalScriptProvider>
  </StrictMode>,
);
