// frontend/src/pages/admin/AdminFaculties.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function AdminFaculties() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const queryClient = useQueryClient();

  // Cargar facultades
  const { data: faculties = [], isLoading } = useQuery({
    queryKey: ["faculties"],
    queryFn: () => api.get("/universities/faculties").then((res) => res.data.data),
  });

  // Crear facultad
 const createMutation = useMutation({
  mutationFn: () =>
    api.post("/universities/faculties", { name, code }),

  onSuccess: () => {
    toast.success("Facultad creada correctamente");
    setName("");
    setCode("");
    queryClient.invalidateQueries({ queryKey: ["faculties"] });
  },

  onError: (err) => {
    toast.error(err.response?.data?.message || "Error al crear facultad");
  },
});

  // Eliminar facultad
  const deleteMutation = useMutation({
  mutationFn: (id) =>
    api.delete(`/universities/faculties/${id}`),

  onSuccess: () => {
    toast.success("Facultad eliminada");
    queryClient.invalidateQueries({ queryKey: ["faculties"] });
  },

  onError: (err) => {
    toast.error(err.response?.data?.message || "Error al eliminar facultad");
  },
});

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facultades</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded flex-1 min-w-[150px]"
        />
        <input
          placeholder="Código"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border p-2 rounded min-w-[100px]"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={!name || !code || createMutation.isLoading}
          className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {createMutation.isLoading ? "Creando..." : "Crear"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ) : (
        <table className="w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="border px-3 py-2 text-left">Nombre</th>
              <th className="border px-3 py-2 text-left">Código</th>
              <th className="border px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {faculties.map((f) => (
              <tr key={f.id} className="hover:bg-gray-50">
                <td className="border px-3 py-2">{f.name}</td>
                <td className="border px-3 py-2">{f.code}</td>
                <td className="border px-3 py-2">
                  <button
                    onClick={() => deleteMutation.mutate(f.id)}
                    disabled={deleteMutation.isLoading}
                    className="text-red-500 hover:underline disabled:opacity-50"
                  >
                    {deleteMutation.isLoading ? "Eliminando..." : "Eliminar"}
                  </button>
                </td>
              </tr>
            ))}
            {faculties.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-400">
                  No hay facultades registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}