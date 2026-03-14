import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import AppRouter from "./router";
import Navbar from "./components/layout/Navbar";
import { useAuthStore } from "./store/authStore";

const queryClient = new QueryClient();

function Layout() {
  const { token } = useAuthStore();
  return (
    <>
      {token && <Navbar />}
      <AppRouter />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout />
        <Toaster position="top-right" />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
