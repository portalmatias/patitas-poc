import { Profesional } from "../domain/turnos";
import { NuevoTurno } from "./repositorio";

export const profesionales: Profesional[] = [
  {
    id: 1,
    nombre: "Dra. Laura Gómez",
    especialidad: "Clínica general",
    diasDeAtencion: [1, 2, 3, 4, 5],
    franjas: [
      { desde: "09:00", hasta: "13:00" },
      { desde: "16:00", hasta: "20:00" },
    ],
  },
  {
    id: 2,
    nombre: "Dr. Martín Ferreyra",
    especialidad: "Cirugía",
    diasDeAtencion: [1, 3, 5],
    franjas: [{ desde: "08:00", hasta: "12:00" }],
  },
  {
    id: 3,
    nombre: "Dra. Sofía Benítez",
    especialidad: "Dermatología y felinos",
    diasDeAtencion: [2, 4, 6],
    franjas: [{ desde: "10:00", hasta: "14:00" }],
  },
];

/** Próximo día hábil (lunes a viernes) en formato AAAA-MM-DD, según la hora local. */
export function proximoDiaHabil(desde = new Date()): string {
  const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Algunos turnos ya tomados para la Dra. Gómez, así la agenda no aparece vacía en la demo. */
export function turnosDeEjemplo(fecha: string): NuevoTurno[] {
  return [
    { profesionalId: 1, fecha, hora: "09:00", duracionMinutos: 30, mascota: "Luna (perra)", tutor: "Ana Torres", motivo: "Vacunación" },
    { profesionalId: 1, fecha, hora: "10:00", duracionMinutos: 60, mascota: "Simba (gato)", tutor: "Jorge Paz", motivo: "Control post operatorio" },
    { profesionalId: 1, fecha, hora: "16:30", duracionMinutos: 30, mascota: "Rocco (perro)", tutor: "Lucía Díaz", motivo: "Consulta por tos" },
  ];
}
