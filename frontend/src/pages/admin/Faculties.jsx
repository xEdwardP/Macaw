import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminFaculties() {
  const [faculties, setFaculties] = useState([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const loadFaculties = async () => {
    const res = await api.get("/universities/faculties");
    setFaculties(res.data.data);
  };

  useEffect(() => {
    loadFaculties();
  }, []);

  const createFaculty = async () => {
    await api.post("/universities/faculties", { name, code });
    setName("");
    setCode("");
    loadFaculties();
  };

  const deleteFaculty = async (id) => {
    await api.delete(`/universities/faculties/${id}`);
    loadFaculties();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Facultades</h1>

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
          onClick={createFaculty}
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
          {faculties.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td>{f.code}</td>
              <td>
                <button
                  onClick={() => deleteFaculty(f.id)}
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