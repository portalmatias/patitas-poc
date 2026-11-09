// Prueba de INTEGRACIÓN (Supertest): se prueba el endpoint completo
// (middlewares + ruta + regla de negocio + manejador de errores) sin levantar el servidor.
import request from "supertest";
import { createApp } from "../src/app";
import { AgendaEnMemoria } from "../src/data/repositorio";
import { profesionales } from "../src/data/seed";

const LUNES = "2030-03-04";
const hoy = () => "2030-01-01";

function appConTurnoDeLas10() {
  const repo = new AgendaEnMemoria(profesionales, [
    { profesionalId: 1, fecha: LUNES, hora: "10:00", duracionMinutos: 30, mascota: "Luna", tutor: "Ana Torres", motivo: "Vacunación" },
  ]);
  return createApp(repo, hoy);
}

const nuevoTurno = { profesionalId: 1, fecha: LUNES, hora: "10:30", duracionMinutos: 30, mascota: "Toby", tutor: "Carlos Ruiz", motivo: "Control" };

describe("POST /turnos", () => {
  it("registra un turno libre y responde 201", async () => {
    const res = await request(appConTurnoDeLas10()).post("/turnos").send(nuevoTurno);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 2, profesionalId: 1, hora: "10:30", estado: "reservado" });
  });

  it("rechaza un turno superpuesto con 409", async () => {
    const res = await request(appConTurnoDeLas10()).post("/turnos").send({ ...nuevoTurno, hora: "10:15" });
    expect(res.status).toBe(409);
    expect(res.body.detalle.turnoExistente.hora).toBe("10:00");
  });

  it("rechaza datos incompletos con 400", async () => {
    const res = await request(appConTurnoDeLas10()).post("/turnos").send({ profesionalId: 1, fecha: LUNES });
    expect(res.status).toBe(400);
    expect(res.body.detalle).toContain("mascota es obligatoria");
  });

  it("rechaza un horario fuera de la agenda del profesional con 422", async () => {
    const res = await request(appConTurnoDeLas10()).post("/turnos").send({ ...nuevoTurno, hora: "14:00" });
    expect(res.status).toBe(422);
  });
});

describe("GET /profesionales/:id/disponibilidad", () => {
  it("no incluye el horario ya reservado", async () => {
    const res = await request(appConTurnoDeLas10()).get(`/profesionales/1/disponibilidad?fecha=${LUNES}`);
    expect(res.status).toBe(200);
    expect(res.body.disponibles).not.toContain("10:00");
    expect(res.body.disponibles).toContain("10:30");
  });

  it("responde 404 si el profesional no existe", async () => {
    const res = await request(appConTurnoDeLas10()).get(`/profesionales/99/disponibilidad?fecha=${LUNES}`);
    expect(res.status).toBe(404);
  });
});
