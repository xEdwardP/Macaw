import { describe, it, expect } from "vitest";

import moneyModule from "../../src/shared/money/money.js";

const {
  money,
  add,
  subtract,
  multiply,
  splitCommission,
  equals,
  greaterThan,
  isPositive,
  toNumber,
} = moneyModule;

describe("aritmética de dinero", () => {
  it("no arrastra el error binario que tiene Float", () => {
    expect(toNumber(add(0.1, 0.2))).toBe(0.3);
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it("suma cien centavos sin desviarse", () => {
    let total = money(0);
    for (let i = 0; i < 100; i++) total = add(total, 0.01);

    expect(toNumber(total)).toBe(1);
  });

  it("redondea a dos decimales al medio hacia arriba", () => {
    expect(toNumber(money(1.005))).toBe(1.01);
    expect(toNumber(money(1.004))).toBe(1);
  });

  it("acepta cadenas, números y Decimal indistintamente", () => {
    expect(equals(money("10.50"), money(10.5))).toBe(true);
    expect(equals(money(money(10.5)), money(10.5))).toBe(true);
  });

  it("resta y multiplica manteniendo la escala", () => {
    expect(toNumber(subtract("10.00", "3.33"))).toBe(6.67);
    expect(toNumber(multiply("10.00", 0.1))).toBe(1);
  });

  it("parte el precio en comisión y neto sin perder un centavo", () => {
    const { commission, net } = splitCommission("10.00", "0.1000");

    expect(toNumber(commission)).toBe(1);
    expect(toNumber(net)).toBe(9);
    expect(toNumber(add(commission, net))).toBe(10);
  });

  it("el reparto cierra incluso con precios que no dividen exacto", () => {
    for (const price of ["9.99", "0.01", "33.33", "7.77", "100.05"]) {
      const { commission, net } = splitCommission(price, "0.1000");
      expect(toNumber(add(commission, net))).toBe(toNumber(money(price)));
    }
  });

  it("compara sin sorpresas de coma flotante", () => {
    expect(greaterThan("10.01", "10.00")).toBe(true);
    expect(greaterThan("10.00", "10.00")).toBe(false);
    expect(isPositive("0.00")).toBe(false);
    expect(isPositive("0.01")).toBe(true);
  });
});
