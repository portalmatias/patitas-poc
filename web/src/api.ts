// Thin client for the Patitas appointments API.

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export interface Franja {
  desde: string;
  hasta: string;
}

export interface Profesional {
  id: number;
  nombre: string;
  especialidad: string;
  diasDeAtencion: number[];
  franjas: Franja[];
}

export interface TurnoOcupado {
  id: number;
  hora: string;
  duracionMinutos: number;
  mascota: string;
  tutor: string;
  motivo: string;
}

export interface Disponibilidad {
  profesional: { id: number; nombre: string };
  fecha: string;
  atiende: boolean;
  duracionSlotMinutos: number;
  disponibles: string[];
  ocupados: TurnoOcupado[];
}

export interface NuevoTurno {
  profesionalId: number;
  fecha: string;
  hora: string;
  duracionMinutos: number;
  mascota: string;
  tutor: string;
  motivo: string;
}

export interface Turno extends NuevoTurno {
  id: number;
  estado: "reservado" | "cancelado";
}

/** Error returned by the API, keeping the HTTP status so the UI can react to 409. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detalle?: unknown
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con la API. ¿Está corriendo el servidor?");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Error ${res.status}`, body.detalle);
  return body as T;
}

export const api = {
  profesionales: () => request<Profesional[]>("/profesionales"),
  disponibilidad: (profesionalId: number, fecha: string) =>
    request<Disponibilidad>(`/profesionales/${profesionalId}/disponibilidad?fecha=${fecha}`),
  crearTurno: (turno: NuevoTurno) => request<Turno>("/turnos", { method: "POST", body: JSON.stringify(turno) }),
};
