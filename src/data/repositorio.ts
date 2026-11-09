// Datos SIMULADOS EN MEMORIA. Se pierden al reiniciar el servidor.
// La interfaz AgendaRepository es la que después implementaría TypeORM con
// PostgreSQL (ver docs/persistencia.md), sin tocar las rutas ni las reglas.

import { Profesional, Turno } from "../domain/turnos";

export interface NuevoTurno extends Omit<Turno, "id" | "estado"> {}

export interface AgendaRepository {
  listarProfesionales(): Profesional[];
  buscarProfesional(id: number): Profesional | undefined;
  turnosDe(profesionalId: number, fecha: string): Turno[];
  crearTurno(datos: NuevoTurno): Turno;
}

export class AgendaEnMemoria implements AgendaRepository {
  private turnos: Turno[] = [];
  private proximoId = 1;

  constructor(private profesionales: Profesional[], turnosIniciales: NuevoTurno[] = []) {
    turnosIniciales.forEach((t) => this.crearTurno(t));
  }

  listarProfesionales() {
    return this.profesionales;
  }

  buscarProfesional(id: number) {
    return this.profesionales.find((p) => p.id === id);
  }

  turnosDe(profesionalId: number, fecha: string) {
    return this.turnos
      .filter((t) => t.profesionalId === profesionalId && t.fecha === fecha)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }

  crearTurno(datos: NuevoTurno) {
    const turno: Turno = { id: this.proximoId++, estado: "reservado", ...datos };
    this.turnos.push(turno);
    return turno;
  }
}
