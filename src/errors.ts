import { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string, public detalle?: unknown) {
    super(message);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.originalUrl}` });
}

// 4 parámetros: así Express sabe que es el manejador de errores.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.detalle ? { detalle: err.detalle } : {}) });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "El cuerpo del pedido no es un JSON válido" });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
}
