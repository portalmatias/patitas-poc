import { Router, Request, Response, NextFunction } from "express";
import { AgendaRepository } from "../data/repositorio";
import { HttpError } from "../errors";
import {
  DURACIONES_PERMITIDAS,
  buscarConflicto,
  calcularDisponibles,
  diaDeLaSemana,
  estaDentroDeLaAgenda,
  intervaloDe,
} from "../domain/turnos";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Express 4 no atrapa solo los errores de funciones async.
const asyncHandler =
  (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res)).catch(next);

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaValida(fecha: unknown): fecha is string {
  if (typeof fecha !== "string" || !FECHA.test(fecha)) return false;
  const [a, m, d] = fecha.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

function parseId(valor: unknown): number {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "El id del profesional debe ser un entero positivo");
  return id;
}

export function agendaRouter(repo: AgendaRepository, hoy: () => string = hoyISO) {
  const router = Router();

  // GET /profesionales
  router.get("/profesionales", (_req, res) => {
    res.json(repo.listarProfesionales());
  });

  // GET /profesionales/:id/disponibilidad?fecha=AAAA-MM-DD
  router.get(
    "/profesionales/:id/disponibilidad",
    asyncHandler((req, res) => {
      const id = parseId(req.params.id);
      const profesional = repo.buscarProfesional(id);
      if (!profesional) throw new HttpError(404, "Profesional no encontrado");

      const { fecha } = req.query;
      if (!fechaValida(fecha)) throw new HttpError(400, "Indicá una fecha válida con el formato AAAA-MM-DD");

      const turnos = repo.turnosDe(id, fecha);
      const disponibles = calcularDisponibles(profesional, fecha, turnos);
      res.json({
        profesional: { id: profesional.id, nombre: profesional.nombre },
        fecha,
        atiende: profesional.diasDeAtencion.includes(diaDeLaSemana(fecha)),
        duracionSlotMinutos: 30,
        disponibles,
        ocupados: turnos
          .filter((t) => t.estado === "reservado")
          .map((t) => ({ id: t.id, hora: t.hora, duracionMinutos: t.duracionMinutos, mascota: t.mascota, tutor: t.tutor, motivo: t.motivo })),
      });
    })
  );

  // POST /turnos
  router.post(
    "/turnos",
    asyncHandler((req, res) => {
      const { profesionalId, fecha, hora, duracionMinutos = 30, mascota, tutor, motivo = "" } = req.body ?? {};

      // 1) Validaciones de datos de entrada -> 400
      const errores: string[] = [];
      if (!Number.isInteger(profesionalId) || profesionalId <= 0) errores.push("profesionalId debe ser un entero positivo");
      if (!fechaValida(fecha)) errores.push("fecha debe tener el formato AAAA-MM-DD");
      if (typeof hora !== "string" || !HORA.test(hora)) errores.push("hora debe tener el formato HH:MM");
      if (!DURACIONES_PERMITIDAS.includes(duracionMinutos)) errores.push(`duracionMinutos debe ser uno de: ${DURACIONES_PERMITIDAS.join(", ")}`);
      if (typeof mascota !== "string" || !mascota.trim()) errores.push("mascota es obligatoria");
      if (typeof tutor !== "string" || !tutor.trim()) errores.push("tutor es obligatorio");
      if (errores.length) throw new HttpError(400, "Datos inválidos", errores);

      if (fecha < hoy()) throw new HttpError(400, "No se pueden registrar turnos en fechas pasadas");

      // 2) El profesional tiene que existir -> 404
      const profesional = repo.buscarProfesional(profesionalId);
      if (!profesional) throw new HttpError(404, "Profesional no encontrado");

      // 3) El turno tiene que caer dentro de su horario de atención -> 422
      const intervalo = intervaloDe(hora, duracionMinutos);
      if (!profesional.diasDeAtencion.includes(diaDeLaSemana(fecha)) || !estaDentroDeLaAgenda(intervalo, profesional.franjas)) {
        throw new HttpError(422, `${profesional.nombre} no atiende en ese día u horario`, { franjas: profesional.franjas });
      }

      // 4) REGLA DE NEGOCIO: un profesional no puede tener dos turnos superpuestos -> 409
      const conflicto = buscarConflicto(intervalo, repo.turnosDe(profesionalId, fecha));
      if (conflicto) {
        throw new HttpError(409, "El profesional ya tiene un turno que se superpone con ese horario", {
          turnoExistente: { id: conflicto.id, hora: conflicto.hora, duracionMinutos: conflicto.duracionMinutos },
        });
      }

      const turno = repo.crearTurno({ profesionalId, fecha, hora, duracionMinutos, mascota: mascota.trim(), tutor: tutor.trim(), motivo });
      res.status(201).json(turno);
    })
  );

  return router;
}
