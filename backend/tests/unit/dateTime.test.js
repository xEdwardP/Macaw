import { describe, it, expect } from "vitest";
import dateTime from "../../src/utils/dateTime.js";

const {
  isSlotWithinBlock,
  doSlotsOverlap,
  getWeekday,
  getSessionStartDateTime,
} = dateTime;

describe("doSlotsOverlap", () => {
  it("detecta solapamiento parcial", () => {
    expect(doSlotsOverlap("10:00", "12:00", "11:00", "13:00")).toBe(true);
  });

  it("detecta solapamiento total", () => {
    expect(doSlotsOverlap("10:00", "14:00", "11:00", "12:00")).toBe(true);
  });

  it("no marca solapamiento en bloques contiguos", () => {
    expect(doSlotsOverlap("10:00", "11:00", "11:00", "12:00")).toBe(false);
  });

  it("no marca solapamiento en bloques separados", () => {
    expect(doSlotsOverlap("08:00", "09:00", "15:00", "16:00")).toBe(false);
  });
});

describe("isSlotWithinBlock", () => {
  it("acepta un slot contenido en el bloque", () => {
    expect(isSlotWithinBlock("08:00", "18:00", "10:00", "11:00")).toBe(true);
  });

  it("acepta un slot que coincide con el bloque", () => {
    expect(isSlotWithinBlock("08:00", "18:00", "08:00", "18:00")).toBe(true);
  });

  it("rechaza un slot que se sale del bloque", () => {
    expect(isSlotWithinBlock("08:00", "12:00", "11:00", "13:00")).toBe(false);
  });

  it("rechaza un slot invertido", () => {
    expect(isSlotWithinBlock("08:00", "18:00", "12:00", "10:00")).toBe(false);
  });
});

describe("getWeekday", () => {
  it("devuelve 7 para domingo y 1 para lunes", () => {
    expect(getWeekday("2026-08-16")).toBe(7);
    expect(getWeekday("2026-08-17")).toBe(1);
  });
});

describe("getSessionStartDateTime", () => {
  it("compone la fecha con la hora de inicio", () => {
    const date = new Date(2026, 7, 20, 0, 0, 0);
    const result = getSessionStartDateTime({ date, startTime: "14:30" });

    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
    expect(result.getDate()).toBe(20);
  });

  it("no confunde una sesión de la tarde con la medianoche", () => {
    const date = new Date(2026, 7, 20, 0, 0, 0);
    const conHora = getSessionStartDateTime({ date, startTime: "18:00" });
    const soloFecha = new Date(date);

    expect((conHora - soloFecha) / 3600000).toBe(18);
  });

  it("tolera startTime ausente", () => {
    const date = new Date(2026, 7, 20, 0, 0, 0);
    const result = getSessionStartDateTime({ date, startTime: undefined });
    expect(result.getHours()).toBe(0);
  });
});
