import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError, type Disponibilidad, type Profesional } from "./api";
import { addDays, buildAgenda, formatDayLabel, formatShortDate, shortName, toISODate } from "./agenda";
import { AgendaList, Legend } from "./components/AgendaList";
import { NewTurnForm, type TurnFormValues } from "./components/NewTurnForm";

type Notice = { tone: "success" | "warning" | "error"; text: string } | null;

function errorLines(err: unknown): string[] {
  if (err instanceof ApiError) {
    const extra = Array.isArray(err.detalle) ? err.detalle.map(String) : [];
    return [err.message, ...extra];
  }
  return ["Ocurrió un error inesperado"];
}

// Container: owns state and talks to the API; components below only render.
export function App() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [profesionalId, setProfesionalId] = useState<number | null>(null);
  const [fecha, setFecha] = useState(() => toISODate(new Date()));
  const [disponibilidad, setDisponibilidad] = useState<Disponibilidad | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    api
      .profesionales()
      .then((list) => {
        setProfesionales(list);
        setProfesionalId((id) => id ?? list[0]?.id ?? null);
      })
      .catch((err) => setNotice({ tone: "error", text: errorLines(err)[0] }));
  }, []);

  const loadAgenda = useCallback(async () => {
    if (profesionalId === null) return;
    setLoading(true);
    try {
      setDisponibilidad(await api.disponibilidad(profesionalId, fecha));
    } catch (err) {
      setDisponibilidad(null);
      setNotice({ tone: "error", text: errorLines(err)[0] });
    } finally {
      setLoading(false);
    }
  }, [profesionalId, fecha]);

  useEffect(() => {
    setSelected(null);
    setFormErrors([]);
    loadAgenda();
  }, [loadAgenda]);

  const profesional = profesionales.find((p) => p.id === profesionalId) ?? null;
  const rows = useMemo(
    () => (profesional && disponibilidad ? buildAgenda(profesional, disponibilidad) : []),
    [profesional, disponibilidad]
  );

  const selectSlot = (hora: string) => {
    setSelected(hora);
    setFormErrors([]);
    setNotice(null);
  };

  const cancel = () => {
    setSelected(null);
    setFormErrors([]);
  };

  const submit = async (values: TurnFormValues) => {
    if (!profesional || !selected) return;
    setSubmitting(true);
    setFormErrors([]);
    try {
      const turno = await api.crearTurno({ profesionalId: profesional.id, fecha, hora: selected, ...values });
      setNotice({
        tone: "success",
        text: `Turno registrado: ${turno.mascota} con ${shortName(profesional.nombre)} el ${formatShortDate(turno.fecha)} a las ${turno.hora}.`,
      });
      setSelected(null);
      setFormKey((k) => k + 1);
      await loadAgenda();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Someone else took the slot meanwhile: keep the typed data and let the user pick another time.
        setNotice({ tone: "warning", text: `${err.message}. Elegí otro horario libre.` });
        setSelected(null);
        await loadAgenda();
      } else {
        setFormErrors(errorLines(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">Patitas</span>
        <nav aria-label="Secciones">
          <a href="#agenda" aria-current="page">
            Agenda
          </a>
          <span className="nav-disabled" title="Disponible en el MVP">
            Mascotas
          </span>
          <span className="nav-disabled" title="Disponible en el MVP">
            Tutores
          </span>
        </nav>
        <span className="user">Carla · Recepción</span>
      </header>

      <main id="agenda" className="content">
        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Profesionales">
            {profesionales.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={p.id === profesionalId}
                className="tab"
                title={p.especialidad}
                onClick={() => setProfesionalId(p.id)}
              >
                {shortName(p.nombre)}
              </button>
            ))}
          </div>

          <div className="date-nav">
            <div className="date-picker">
              <button type="button" aria-label="Día anterior" onClick={() => setFecha((f) => addDays(f, -1))}>
                ‹
              </button>
              <span aria-live="polite">{formatDayLabel(fecha)}</span>
              <button type="button" aria-label="Día siguiente" onClick={() => setFecha((f) => addDays(f, 1))}>
                ›
              </button>
            </div>
            <button type="button" className="btn" onClick={() => setFecha(toISODate(new Date()))}>
              Hoy
            </button>
          </div>
        </div>

        {notice && (
          <div className={`notice notice-${notice.tone}`} role={notice.tone === "success" ? "status" : "alert"}>
            <span>{notice.text}</span>
            <button type="button" aria-label="Cerrar aviso" onClick={() => setNotice(null)}>
              ×
            </button>
          </div>
        )}

        <div className="layout">
          <section className="panel agenda-panel" aria-busy={loading}>
            {disponibilidad && !disponibilidad.atiende ? (
              <p className="empty">
                {profesional && shortName(profesional.nombre)} no atiende este día. Probá con otra fecha u otro
                profesional.
              </p>
            ) : (
              <>
                <AgendaList rows={rows} selected={selected} onSelect={selectSlot} />
                {disponibilidad && disponibilidad.disponibles.length === 0 && (
                  <p className="empty">No quedan horarios libres. Probá con otra fecha u otro profesional.</p>
                )}
              </>
            )}
            <Legend />
          </section>

          {selected && profesional ? (
            <NewTurnForm
              key={formKey}
              profesional={shortName(profesional.nombre)}
              fecha={formatShortDate(fecha)}
              hora={selected}
              submitting={submitting}
              errors={formErrors}
              onCancel={cancel}
              onSubmit={submit}
            />
          ) : (
            <aside className="panel form-hint">
              <h2>Nuevo turno</h2>
              <p>Tocá un horario libre de la agenda para reservarlo.</p>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
