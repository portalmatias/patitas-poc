import { createApp } from "./app";
import { AgendaEnMemoria } from "./data/repositorio";
import { profesionales, proximoDiaHabil, turnosDeEjemplo } from "./data/seed";

const PORT = Number(process.env.PORT) || 4000;
const fechaDemo = proximoDiaHabil();
const repo = new AgendaEnMemoria(profesionales, turnosDeEjemplo(fechaDemo));

createApp(repo).listen(PORT, () => {
  console.log(`API de turnos en http://localhost:${PORT}`);
  console.log(`Datos simulados en memoria. Turnos de ejemplo cargados para la Dra. Gómez el ${fechaDemo}`);
});
