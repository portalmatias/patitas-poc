// Pure helpers to turn the API response into the rows the agenda renders.
import type { Disponibilidad, Profesional, TurnoOcupado } from "./api";

export const SLOT_MINUTES = 30;

export type AgendaRow =
  | { kind: "libre"; hora: string }
  | { kind: "ocupado"; hora: string; turno: TurnoOcupado; slots: number }
  | { kind: "pausa"; hora: string };

export function toMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function toHora(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/**
 * Builds one row per 30-minute slot of the professional's working hours.
 * A booked appointment becomes a single row spanning every slot it overlaps,
 * so a 60-minute visit visibly takes two blocks. Slots the API did not list as
 * free (and no visible appointment covers) are shown as unavailable.
 */
export function buildAgenda(profesional: Profesional, disponibilidad: Disponibilidad): AgendaRow[] {
  const libres = new Set(disponibilidad.disponibles);
  const rows: AgendaRow[] = [];

  profesional.franjas.forEach((franja, index) => {
    if (index > 0) rows.push({ kind: "pausa", hora: franja.desde });
    const end = toMinutes(franja.hasta);
    let start = toMinutes(franja.desde);

    while (start + SLOT_MINUTES <= end) {
      const turno = disponibilidad.ocupados.find((t) => {
        const tStart = toMinutes(t.hora);
        return tStart < start + SLOT_MINUTES && start < tStart + t.duracionMinutos;
      });

      if (turno) {
        const tEnd = Math.min(toMinutes(turno.hora) + turno.duracionMinutos, end);
        const slots = Math.max(1, Math.ceil((tEnd - start) / SLOT_MINUTES));
        rows.push({ kind: "ocupado", hora: toHora(start), turno, slots });
        start += slots * SLOT_MINUTES;
        continue;
      }

      const hora = toHora(start);
      if (libres.has(hora)) rows.push({ kind: "libre", hora });
      start += SLOT_MINUTES;
    }
  });

  return rows;
}

/** Local date as YYYY-MM-DD (not UTC, so late-evening use does not jump a day). */
export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromISODate(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(fecha: string, days: number): string {
  const d = fromISODate(fecha);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "2026-11-10" -> "Martes 10/11" */
export function formatDayLabel(fecha: string): string {
  const d = fromISODate(fecha);
  const weekday = d.toLocaleDateString("es-AR", { weekday: "long" });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "2026-11-10" -> "10/11" */
export function formatShortDate(fecha: string): string {
  const [, m, d] = fecha.split("-");
  return `${d}/${m}`;
}

/** "Dra. Laura Gómez" -> "Dra. Gómez" */
export function shortName(nombre: string): string {
  const parts = nombre.split(" ");
  return parts.length > 2 ? `${parts[0]} ${parts[parts.length - 1]}` : nombre;
}
