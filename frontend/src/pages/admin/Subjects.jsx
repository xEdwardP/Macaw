import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const loadSubjects = async () => {
    const res = await api.get("/universities/subjects");
    setSubjects(res.data.data);
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const createSubject = async () => {
    await api.post("/universities/subjects", {
      name,
      code,
    });
    setName("");
    setCode("");
    loadSubjects();
  };

  const deleteSubject = async (id) => {
    await api.delete(`/universities/subjects/${id}`);
    loadSubjects();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Materias</h1>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2"
        />
        <input
          placeholder="Código"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border p-2"
        />
        <button
          onClick={createSubject}
          className="bg-orange-500 text-white px-4 py-2"
        >
          Crear
        </button>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Código</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{s.code}</td>
              <td>
                <button
                  onClick={() => deleteSubject(s.id)}
                  className="text-red-500"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}