// Reglas de negocio de la agenda. Son funciones puras: no dependen de Express
// ni de la base de datos, por eso se pueden probar de forma aislada con Jest.

export interface Franja {
  desde: string; // "09:00"
  hasta: string; // "13:00"
}

export interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  diasDeAtencion: number[]; // 0 = domingo ... 6 = sábado
  franjas: Franja[];
}

export interface Turno {
  id: number;
  profesionalId: number;
  fecha: string; // "AAAA-MM-DD"
  hora: string; // "HH:MM"
  duracionMinutos: number;
  mascota: string;
  tutor: string;
  motivo: string;
  estado: "reservado" | "cancelado";
}

export interface Intervalo {
  inicio: number; // minutos desde las 00:00
  fin: number;
}

export const DURACION_SLOT = 30;
export const DURACIONES_PERMITIDAS = [15, 30, 45, 60, 90];

/** "09:30" -> 570 */
export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30" */
export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function intervaloDe(hora: string, duracionMinutos: number): Intervalo {
  const inicio = aMinutos(hora);
  return { inicio, fin: inicio + duracionMinutos };
}

/**
 * REGLA DE NEGOCIO: dos turnos se superponen si uno empieza antes de que
 * termine el otro. Si uno termina justo cuando empieza el otro (10:00-10:30 y
 * 10:30-11:00) NO se superponen.
 */
export function seSuperponen(a: Intervalo, b: Intervalo): boolean {
  return a.inicio < b.fin && b.inicio < a.fin;
}

/** ¿El turno nuevo choca con alguno de los turnos activos del profesional? */
export function buscarConflicto(nuevo: Intervalo, existentes: Turno[]): Turno | undefined {
  return existentes
    .filter((t) => t.estado === "reservado")
    .find((t) => seSuperponen(nuevo, intervaloDe(t.hora, t.duracionMinutos)));
}

/** ¿El intervalo cae completo dentro de alguna franja de atención? */
export function estaDentroDeLaAgenda(intervalo: Intervalo, franjas: Franja[]): boolean {
  return franjas.some((f) => intervalo.inicio >= aMinutos(f.desde) && intervalo.fin <= aMinutos(f.hasta));
}

/** Día de la semana de una fecha "AAAA-MM-DD" sin depender de la zona horaria del servidor. */
export function diaDeLaSemana(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

/** Lista los horarios libres de un profesional para una fecha, en bloques de 30 minutos. */
export function calcularDisponibles(profesional: Profesional, fecha: string, turnosDelDia: Turno[]): string[] {
  if (!profesional.diasDeAtencion.includes(diaDeLaSemana(fecha))) return [];

  const libres: string[] = [];
  for (const franja of profesional.franjas) {
    for (let inicio = aMinutos(franja.desde); inicio + DURACION_SLOT <= aMinutos(franja.hasta); inicio += DURACION_SLOT) {
      const slot = { inicio, fin: inicio + DURACION_SLOT };
      if (!buscarConflicto(slot, turnosDelDia)) libres.push(aHora(inicio));
    }
  }
  return libres;
}
