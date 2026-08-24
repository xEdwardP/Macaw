import { describe, it, expect } from "vitest";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { translator } = require("../../src/shared/i18n/index.js");
const { resolve, normalize } = require("../../src/shared/i18n/locales.js");
const templates = require("../../src/utils/emailTemplates.js");

const plainSpaces = (value) => value.replace(/ /g, " ");

describe("resolución de idioma", () => {
  it("acepta etiquetas regionales y las reduce al idioma base", () => {
    expect(normalize("en-US")).toBe("en");
    expect(normalize("es_HN")).toBe("es");
  });

  it("descarta idiomas no soportados", () => {
    expect(normalize("fr")).toBeNull();
    expect(normalize(undefined)).toBeNull();
  });

  it("toma el primer candidato válido de la cadena", () => {
    expect(resolve(null, "en", "es")).toBe("en");
    expect(resolve(null, "fr", "es")).toBe("es");
  });

  it("cae al español cuando ningún candidato sirve", () => {
    expect(resolve(null, undefined, "de")).toBe("es");
  });
});

describe("traductor del servidor", () => {
  it("interpola los parámetros", () => {
    const t = translator("en");

    expect(t("email.invitation.subject", { institutionName: "UNICAH" })).toBe(
      "UNICAH invited you to Macaw",
    );
  });

  it("cae al español cuando falta una clave en el otro idioma", () => {
    const t = translator("en");

    expect(t("email.brand.privacy")).toBe("Privacy policy");
  });

  it("devuelve la clave cuando no existe en ningún idioma", () => {
    expect(translator("es")("email.noExiste.enAbsoluto")).toBe(
      "email.noExiste.enAbsoluto",
    );
  });

  it("formatea el dinero en la moneda que se le pasa", () => {
    expect(plainSpaces(translator("es").money(1234.5, "HNL"))).toBe(
      "L 1,234.50",
    );
    expect(plainSpaces(translator("es").money(1234.5, "USD"))).toBe(
      "USD 1,234.50",
    );
  });
});

describe("plantillas de correo", () => {
  it("devuelve asunto y cuerpo en el idioma del destinatario", () => {
    const spanish = templates.withdrawalApproved(
      { tutorName: "Ana", amount: 50, currency: "USD", paypalEmail: "a@b.com" },
      "es",
    );
    const english = templates.withdrawalApproved(
      { tutorName: "Ana", amount: 50, currency: "USD", paypalEmail: "a@b.com" },
      "en",
    );

    expect(spanish.subject).toBe("Retiro aprobado");
    expect(english.subject).toBe("Withdrawal approved");
    expect(spanish.html).toContain("tu solicitud de retiro fue aprobada");
    expect(english.html).toContain("your withdrawal request was approved");
  });

  it("marca el idioma del documento", () => {
    expect(templates.sessionReminder({ userName: "Ana" }, "en").html).toContain(
      '<html lang="en">',
    );
  });

  it("usa el español cuando el destinatario no tiene idioma", () => {
    expect(templates.sessionCancelled({ userName: "Ana" }, null).subject).toBe(
      "Sesión cancelada",
    );
  });

  it("formatea los montos en la moneda de la institución, no en dólares", () => {
    const { html } = templates.withdrawalRejected(
      { tutorName: "Ana", amount: 250, currency: "HNL", notes: null },
      "es",
    );

    expect(plainSpaces(html)).toContain("L 250.00");
    expect(html).not.toContain("$250.00");
  });

  it("rellena el motivo cuando el rechazo no trae notas", () => {
    expect(
      templates.withdrawalRejected(
        { tutorName: "Ana", amount: 10, currency: "USD", notes: null },
        "en",
      ).html,
    ).toContain("No reason given");
  });

  it("cambia el asunto y el tono según el umbral del plan", () => {
    const near = templates.planUsageWarning(
      {
        adminName: "Ana",
        institutionName: "UNICAH",
        planName: "Starter",
        students: 90,
        maxStudents: 100,
        threshold: 0.9,
      },
      "en",
    );
    const reached = templates.planUsageWarning(
      {
        adminName: "Ana",
        institutionName: "UNICAH",
        planName: "Starter",
        students: 100,
        maxStudents: 100,
        threshold: 1,
      },
      "en",
    );

    expect(near.subject).toBe("UNICAH is close to its plan limit");
    expect(reached.subject).toBe("UNICAH reached its plan limit");
    expect(reached.html).toContain("No new students are admitted");
  });

  it("fecha la caducidad en la zona horaria de la plataforma", () => {
    const { html } = templates.invitation(
      {
        name: "Ana",
        institutionName: "UNICAH",
        role: "tutor",
        acceptUrl: "https://macaw.test/i/abc",
        expiresAt: new Date("2026-09-01T15:00:00Z"),
      },
      "es",
    );

    expect(html).toContain("1 de septiembre de 2026");
  });

  it("no deja el nombre sin rellenar en una invitación sin nombre", () => {
    const { html } = templates.invitation(
      {
        name: null,
        institutionName: "UNICAH",
        role: "student",
        acceptUrl: "https://macaw.test/i/abc",
        expiresAt: new Date("2026-09-01T00:00:00Z"),
      },
      "en",
    );

    expect(html).toContain("UNICAH");
    expect(html).not.toContain("{{name}}");
    expect(html).not.toContain("undefined");
  });
});
