// Prueba UNITARIA (Jest): la regla de negocio se prueba aislada, sin servidor ni base.
import { seSuperponen, buscarConflicto, calcularDisponibles, Turno } from "../src/domain/turnos";
import { profesionales } from "../src/data/seed";

const turno = (hora: string, duracionMinutos: number, estado: Turno["estado"] = "reservado"): Turno => ({
  id: 1, profesionalId: 1, fecha: "2030-03-04", hora, duracionMinutos, mascota: "Luna", tutor: "Ana", motivo: "", estado,
});

describe("seSuperponen", () => {
  it("detecta un turno que empieza en medio de otro", () => {
    // 10:00-11:00 y 10:30-11:00
    expect(seSuperponen({ inicio: 600, fin: 660 }, { inicio: 630, fin: 660 })).toBe(true);
  });

  it("detecta un turno que contiene por completo a otro", () => {
    expect(seSuperponen({ inicio: 600, fin: 720 }, { inicio: 630, fin: 660 })).toBe(true);
  });

  it("permite turnos consecutivos (uno termina cuando empieza el otro)", () => {
    // 10:00-10:30 y 10:30-11:00
    expect(seSuperponen({ inicio: 600, fin: 630 }, { inicio: 630, fin: 660 })).toBe(false);
  });
});

describe("buscarConflicto", () => {
  it("ignora los turnos cancelados", () => {
    expect(buscarConflicto({ inicio: 600, fin: 630 }, [turno("10:00", 30, "cancelado")])).toBeUndefined();
  });
});

describe("calcularDisponibles", () => {
  const draGomez = profesionales[0];

  it("no ofrece los horarios ocupados", () => {
    const libres = calcularDisponibles(draGomez, "2030-03-04", [turno("10:00", 60)]);
    expect(libres).not.toContain("10:00");
    expect(libres).not.toContain("10:30");
    expect(libres).toContain("11:00");
  });

  it("devuelve una lista vacía si el profesional no atiende ese día", () => {
    expect(calcularDisponibles(draGomez, "2030-03-10", [])).toEqual([]); // domingo
  });
});
