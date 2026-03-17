import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const res = await api.get("/universities/subjects");
      setSubjects(res.data.data);
    } catch (err) {
      toast.error("Error al cargar materias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const createSubject = async () => {
    if (!name || !code) return toast.error("Nombre y código son requeridos");
    setActionLoading(true);
    try {
      await api.post("/universities/subjects", { name, code });
      setName("");
      setCode("");
      await loadSubjects();
      toast.success("Materia creada");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al crear materia");
    } finally {
      setActionLoading(false);
    }
  };

  const deleteSubject = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta materia?")) return;
    setActionLoading(true);
    try {
      await api.delete(`/universities/subjects/${id}`);
      await loadSubjects();
      toast.success("Materia eliminada");
    } catch (err) {
      toast.error(err.response?.data?.message || "Error al eliminar materia");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 min-h-screen bg-gray-50"
    >
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Materias</h1>
      <p className="text-gray-500 mb-6">Gestiona las materias de la universidad</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded-lg flex-1 min-w-[120px]"
        />
        <input
          placeholder="Código"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border p-2 rounded-lg min-w-[120px]"
        />
        <button
          onClick={createSubject}
          disabled={actionLoading}
          className={`px-4 py-2 rounded-lg text-white bg-orange-600 hover:bg-orange-700 transition-colors ${
            actionLoading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {actionLoading ? "Creando..." : "Crear"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm animate-pulse h-16" />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900">No hay materias aún</h3>
          <p className="text-gray-500 mt-2 mb-4">Crea tu primera materia para empezar</p>
          <button
            onClick={createSubject}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
          >
            Crear materia
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <motion.table
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full border-collapse min-w-[400px]"
          >
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 border-b border-gray-200">Nombre</th>
                <th className="text-left p-3 border-b border-gray-200">Código</th>
                <th className="p-3 border-b border-gray-200"></th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.code}</td>
                  <td className="p-3">
                    <button
                      onClick={() => deleteSubject(s.id)}
                      disabled={actionLoading}
                      className={`text-red-500 hover:underline ${
                        actionLoading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      Eliminar
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </motion.table>
        </div>
      )}
    </motion.div>
  );
}