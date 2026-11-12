import path from "path";
import express from "express";
import cors from "cors";
import { AgendaRepository } from "./data/repositorio";
import { agendaRouter } from "./routes/agenda.routes";
import { errorHandler, notFoundHandler } from "./errors";

// La app se arma en una función para poder probarla con Supertest
// inyectando un repositorio con datos controlados.
export function createApp(repo: AgendaRepository, hoy?: () => string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Pantalla de agenda (HTML + JS sin build): la carpeta public/ se sirve en la raíz.
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use(agendaRouter(repo, hoy));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
