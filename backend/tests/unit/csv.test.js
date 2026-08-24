import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { parseCsv, toRecords } = require("../../src/shared/csv/parseCsv.js");

describe("parser de CSV", () => {
  it("separa filas y columnas simples", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("respeta las comas dentro de comillas", () => {
    const rows = parseCsv('name,email\n"Pérez, Ana",ana@test.edu');

    expect(rows[1]).toEqual(["Pérez, Ana", "ana@test.edu"]);
  });

  it("respeta los saltos de línea dentro de comillas", () => {
    const rows = parseCsv('note,code\n"linea 1\nlinea 2",A1');

    expect(rows).toHaveLength(2);
    expect(rows[1][0]).toBe("linea 1\nlinea 2");
  });

  it("interpreta las comillas escapadas", () => {
    const rows = parseCsv('name\n"Ana ""La Jefa"" Pérez"');

    expect(rows[1][0]).toBe('Ana "La Jefa" Pérez');
  });

  it("acepta finales de línea de Windows", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignora la marca de orden de bytes que agrega Excel", () => {
    const rows = parseCsv("﻿name,email\nAna,ana@test.edu");

    expect(rows[0][0]).toBe("name");
  });

  it("descarta las filas completamente vacías", () => {
    expect(parseCsv("a,b\n\n1,2\n\n")).toHaveLength(2);
  });

  it("rechaza un archivo con comillas sin cerrar", () => {
    expect(() => parseCsv('name\n"sin cerrar')).toThrowError(/comillas/);
  });

  it("convierte a registros con el número de fila real del archivo", () => {
    const records = toRecords("name,email\nAna,ana@test.edu\nBeto,beto@test.edu");

    expect(records).toEqual([
      { row: 2, values: { name: "Ana", email: "ana@test.edu" } },
      { row: 3, values: { name: "Beto", email: "beto@test.edu" } },
    ]);
  });

  it("exige las columnas obligatorias", () => {
    expect(() => toRecords("nombre,correo\nAna,ana@test.edu", ["name", "email"]))
      .toThrowError(/Faltan columnas/);
  });

  it("rechaza un archivo sin filas de datos", () => {
    expect(() => toRecords("name,email")).toThrowError(/no contiene filas/);
  });

  it("recorta los espacios alrededor de cada valor", () => {
    const records = toRecords("name, email \n Ana , ana@test.edu ");

    expect(records[0].values).toEqual({ name: "Ana", email: "ana@test.edu" });
  });
});
