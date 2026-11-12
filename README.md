# Patitas · PoC de agenda de turnos

Prueba de Concepto del **Segundo Parcial Integrador** de Construcción de Sitios Web II (IRESM, 2026).
**Grupo 4:** Matias Portal, Federico Werkmeister y Facundo Lusso.

Demuestra que se puede consultar la disponibilidad de un profesional y registrar turnos respetando la regla de negocio de la clínica:

> **Un profesional no puede tener dos turnos superpuestos.**

**Datos:** simulados y **almacenados en memoria**. Al iniciar se cargan 3 profesionales y 3 turnos de ejemplo para la Dra. Gómez en el próximo día hábil. Al reiniciar el servidor, los turnos nuevos se pierden. Cómo se persistirían con PostgreSQL y TypeORM está en [`docs/persistencia.md`](docs/persistencia.md).

## Tecnologías

Node.js 18 o superior · TypeScript 5 · Express 4 · Jest + Supertest (pruebas)

## Cómo ejecutarla

```bash
npm install
npm run dev
```

La consola muestra:

```
API de turnos en http://localhost:4000
Datos simulados en memoria. Turnos de ejemplo cargados para la Dra. Gómez el AAAA-MM-DD
```

Usen esa fecha en las pruebas. Para correr los tests: `npm test`.

## Frontend: agenda de recepción

En `web/` está la pantalla de agenda por profesional, hecha con React, TypeScript y Vite a partir del wireframe, la user persona y el user flow del Anexo A de la propuesta. Con la API corriendo, en otra terminal:

```bash
npm --prefix web install
npm run web
```

Abran http://localhost:5173. Vite redirige `/api` a la API en el puerto 4000; para usar otra dirección, definan `API_URL` al levantar Vite o `VITE_API_URL` al compilar.

- Una pestaña por profesional y la fecha arriba, con los botones ‹ › y **Hoy**.
- La agenda va en bloques de 30 minutos. Los turnos ocupados muestran mascota, tutor y motivo; un turno largo ocupa varios bloques.
- Solo los horarios libres se pueden tocar. El formulario ya trae el profesional, la fecha y la hora; se completan la mascota, el tutor, el motivo y la duración.
- Si otra persona ocupó el horario mientras se cargaban los datos, la API responde 409 y la pantalla avisa y actualiza la agenda en lugar de guardar un turno doble.
- Las secciones Mascotas y Tutores, y el buscador de tutores del wireframe, quedan para el MVP: la PoC no tiene ABM de tutores.

## Endpoints

| Método | Ruta | Qué hace | Respuestas |
| --- | --- | --- | --- |
| GET | `/profesionales` | Lista los profesionales y su horario de atención | 200 |
| GET | `/profesionales/:id/disponibilidad?fecha=AAAA-MM-DD` | Horarios libres del profesional, en bloques de 30 min | 200 · 400 · 404 |
| POST | `/turnos` | Registra un turno validando las reglas | 201 · 400 · 404 · 409 · 422 |

### Ejemplo 1: consultar disponibilidad

```
GET http://localhost:4000/profesionales/1/disponibilidad?fecha=2026-11-10
```

```json
{
  "profesional": { "id": 1, "nombre": "Dra. Laura Gómez" },
  "fecha": "2026-11-10",
  "atiende": true,
  "duracionSlotMinutos": 30,
  "disponibles": ["09:30", "11:00", "11:30", "12:00", "12:30", "16:00", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"],
  "ocupados": [
    { "id": 1, "hora": "09:00", "duracionMinutos": 30, "mascota": "Luna (perra)", "tutor": "Ana Torres", "motivo": "Vacunación" },
    { "id": 2, "hora": "10:00", "duracionMinutos": 60, "mascota": "Simba (gato)", "tutor": "Jorge Paz", "motivo": "Control post operatorio" },
    { "id": 3, "hora": "16:30", "duracionMinutos": 30, "mascota": "Rocco (perro)", "tutor": "Lucía Díaz", "motivo": "Consulta por tos" }
  ]
}
```

### Ejemplo 2: registrar un turno libre → 201 Created

```
POST http://localhost:4000/turnos
Content-Type: application/json

{
  "profesionalId": 1,
  "fecha": "2026-11-10",
  "hora": "11:00",
  "duracionMinutos": 30,
  "mascota": "Toby (perro)",
  "tutor": "Carlos Ruiz",
  "motivo": "Control anual"
}
```

```json
{ "id": 4, "estado": "reservado", "profesionalId": 1, "fecha": "2026-11-10", "hora": "11:00", "duracionMinutos": 30, "mascota": "Toby (perro)", "tutor": "Carlos Ruiz", "motivo": "Control anual" }
```

### Ejemplo 3: turno superpuesto → 409 Conflict (regla de negocio)

Mismo pedido con `"hora": "10:30"`. La Dra. Gómez ya tiene un turno de 10:00 a 11:00:

```json
{
  "error": "El profesional ya tiene un turno que se superpone con ese horario",
  "detalle": { "turnoExistente": { "id": 2, "hora": "10:00", "duracionMinutos": 60 } }
}
```

### Otras validaciones

| Caso | Código |
| --- | --- |
| Faltan datos o tienen mal formato (hora, fecha, mascota, tutor, duración) | 400 |
| Fecha anterior a hoy | 400 |
| JSON mal formado | 400 |
| Profesional inexistente | 404 |
| Día u horario fuera de la agenda del profesional | 422 |
| Se superpone con otro turno del mismo profesional | 409 |

Duraciones permitidas: 15, 30, 45, 60 o 90 minutos. Dos turnos consecutivos (10:00–10:30 y 10:30–11:00) **no** se superponen.

## Demostración con Postman o Thunder Client

Importen `docs/patitas-poc.postman_collection.json` (sirve en Postman y en Thunder Client). Cambien la variable `fecha` por la que muestra la consola.

## Estructura

```
src/
  index.ts                 arranque del servidor
  app.ts                   arma la app de Express (middlewares, rutas, errores)
  domain/turnos.ts         reglas de negocio (funciones puras)
  routes/agenda.routes.ts  endpoints y validaciones
  data/repositorio.ts      interfaz del repositorio + implementación en memoria
  data/seed.ts             datos simulados
  errors.ts                HttpError, 404 y manejador de errores
tests/
  turnos.unit.test.ts      pruebas unitarias (Jest)
  agenda.int.test.ts       pruebas de integración (Supertest)
docs/
  persistencia.md          modelo de datos y TypeORM
```

## Qué falta para convertir la PoC en el sistema completo

- Persistencia real en PostgreSQL con TypeORM, migraciones y la restricción de exclusión en la base.
- Autenticación (login) y autorización por rol: recepción, veterinario y administrador.
- ABM de tutores, mascotas y profesionales; cancelar y reprogramar turnos.
- Historia clínica de cada mascota (atenciones, vacunas, tratamientos) con registro de quién modificó qué.
- Frontend: agenda por profesional, fichas de mascotas e historia clínica.
- Recordatorios de turnos (correo o WhatsApp).
- Despliegue en la nube con HTTPS, backups automáticos y monitoreo.
