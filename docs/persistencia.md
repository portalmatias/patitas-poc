# Persistencia con PostgreSQL y TypeORM (propuesta)

La PoC guarda los datos **en memoria** (clase `AgendaEnMemoria`). Para el sistema completo se reemplaza por una implementación de la misma interfaz `AgendaRepository` que use TypeORM sobre PostgreSQL. Las rutas y las reglas de negocio no cambian.

## Datos que necesita la funcionalidad de turnos

| Entidad | Datos principales | Relación |
| --- | --- | --- |
| `Profesional` | id, nombre, especialidad, matrícula, activo | 1 profesional → N turnos, N franjas |
| `FranjaAtencion` | id, profesionalId, díaSemana, desde, hasta | N franjas → 1 profesional |
| `Tutor` | id, nombre, DNI, teléfono, email | 1 tutor → N mascotas |
| `Mascota` | id, nombre, especie, raza, fechaNacimiento, tutorId | 1 mascota → N turnos, N atenciones |
| `Turno` | id, profesionalId, mascotaId, inicio, fin, motivo, estado, creadoPor | N turnos → 1 profesional, 1 mascota |
| `Usuario` | id, email, hashContraseña, rol (`recepcion`, `veterinario`, `admin`) | para el control de acceso |

En el sistema completo se suma `AtencionClinica` (historia clínica: diagnóstico, tratamiento, vacunas), que queda fuera de esta PoC.

## Entidad `Turno` en TypeORM

```ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from "typeorm";
import { Profesional } from "./Profesional";
import { Mascota } from "./Mascota";

@Entity()
@Index(["profesional", "inicio"])
export class Turno {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Profesional, (p) => p.turnos, { nullable: false })
  profesional: Profesional;

  @ManyToOne(() => Mascota, (m) => m.turnos, { nullable: false })
  mascota: Mascota;

  @Column({ type: "timestamptz" })
  inicio: Date;

  @Column({ type: "timestamptz" })
  fin: Date;

  @Column({ type: "text", default: "" })
  motivo: string;

  @Column({ default: "reservado" })
  estado: "reservado" | "cancelado" | "atendido";
}
```

## La regla también en la base de datos

En la PoC la regla se valida en el código (`buscarConflicto`). Con varios usuarios a la vez, dos pedidos simultáneos podrían pasar la validación al mismo tiempo. Para evitarlo, PostgreSQL permite una **restricción de exclusión** que rechaza los turnos superpuestos de un mismo profesional:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE turno
  ADD CONSTRAINT turno_sin_superposicion
  EXCLUDE USING gist (
    "profesionalId" WITH =,
    tstzrange(inicio, fin) WITH &&
  ) WHERE (estado <> 'cancelado');
```

Si el INSERT viola la restricción, PostgreSQL devuelve el error `23P01` y la API responde **409 Conflict**, igual que hoy.

## Implementación del repositorio

```ts
export class AgendaTypeORM implements AgendaRepository {
  private turnos = AppDataSource.getRepository(Turno);
  // turnosDe() -> this.turnos.find({ where: { profesional: { id }, inicio: Between(desde, hasta) } })
  // crearTurno() -> this.turnos.save(this.turnos.create(datos))
}
```

La conexión se configura en `data-source.ts` con variables de entorno (`DATABASE_URL`), con `synchronize: false` y **migraciones** en producción.
