import { describe, it, expect } from "vitest";

import policyModule from "../../src/modules/policies/tutoring.policy.js";

const { evaluate, assertCanBook, visibleInstitutionIds } = policyModule;

const institution = (id, overrides = {}) => ({
  id,
  type: "university",
  currencyCode: "USD",
  settings: {},
  ...overrides,
});

const open = (allowList) => ({
  allowCrossInstitutionTutoring: true,
  ...(allowList ? { crossInstitutionAllowList: allowList } : {}),
});

describe("política de tutorías entre instituciones", () => {
  it("permite la misma institución", () => {
    const a = institution("a");
    expect(evaluate(a, a).allowed).toBe(true);
  });

  it("deniega por defecto entre instituciones distintas", () => {
    const result = evaluate(institution("a"), institution("b"));

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CROSS_INSTITUTION_NOT_ALLOWED");
  });

  it("deniega si solo una de las dos abre el cruce", () => {
    const a = institution("a", { settings: open() });
    const b = institution("b");

    expect(evaluate(a, b).allowed).toBe(false);
  });

  it("permite si ambas abren el cruce", () => {
    const a = institution("a", { settings: open() });
    const b = institution("b", { settings: open() });

    expect(evaluate(a, b).allowed).toBe(true);
  });

  it("respeta la lista blanca cuando no está vacía", () => {
    const a = institution("a", { settings: open(["c"]) });
    const b = institution("b", { settings: open() });

    expect(evaluate(a, b).allowed).toBe(false);
    expect(evaluate(a, institution("c", { settings: open() })).allowed).toBe(
      true,
    );
  });

  it("deniega entre monedas distintas aunque el cruce esté abierto", () => {
    const a = institution("a", { settings: open() });
    const b = institution("b", { currencyCode: "HNL", settings: open() });

    const result = evaluate(a, b);

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("CROSS_CURRENCY_NOT_ALLOWED");
  });

  it("permite entre monedas distintas si ambas lo habilitan", () => {
    const settings = { ...open(), allowCrossCurrencySessions: true };
    const a = institution("a", { settings });
    const b = institution("b", { currencyCode: "HNL", settings });

    expect(evaluate(a, b).allowed).toBe(true);
  });

  it("deniega si el estudiante no tiene institución", () => {
    const result = evaluate(null, institution("b"));

    expect(result.allowed).toBe(false);
    expect(result.code).toBe("INSTITUTION_REQUIRED");
  });

  it("los colegios heredan el cruce cerrado por defecto de su tipo", () => {
    const school = institution("s", { type: "school" });

    expect(evaluate(school, institution("b")).allowed).toBe(false);
  });

  it("assertCanBook lanza con el código de la evaluación", () => {
    expect(() => assertCanBook(institution("a"), institution("b"))).toThrow(
      /otra institución/,
    );

    try {
      assertCanBook(institution("a"), institution("b"));
    } catch (err) {
      expect(err.code).toBe("CROSS_INSTITUTION_NOT_ALLOWED");
      expect(err.status).toBe(403);
    }
  });

  it("assertCanBook no lanza dentro de la misma institución", () => {
    const a = institution("a");
    expect(() => assertCanBook(a, a)).not.toThrow();
  });

  it("visibleInstitutionIds filtra el catálogo completo", () => {
    const student = institution("a", { settings: open() });
    const candidates = [
      student,
      institution("b", { settings: open() }),
      institution("c"),
      institution("d", { currencyCode: "HNL", settings: open() }),
    ];

    expect(visibleInstitutionIds(student, candidates)).toEqual(["a", "b"]);
  });
});
