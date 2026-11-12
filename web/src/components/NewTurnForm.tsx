import { useEffect, useRef, useState, type FormEvent } from "react";

export const DURATIONS = [15, 30, 45, 60, 90];

export interface TurnFormValues {
  mascota: string;
  tutor: string;
  motivo: string;
  duracionMinutos: number;
}

interface Props {
  profesional: string;
  fecha: string;
  hora: string;
  submitting: boolean;
  errors: string[];
  onCancel: () => void;
  onSubmit: (values: TurnFormValues) => void;
}

const EMPTY: TurnFormValues = { mascota: "", tutor: "", motivo: "", duracionMinutos: 30 };

// Presentational form: professional, date and time come from the selected slot and are not retyped.
export function NewTurnForm({ profesional, fecha, hora, submitting, errors, onCancel, onSubmit }: Props) {
  const [values, setValues] = useState<TurnFormValues>(EMPTY);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstField.current?.focus();
  }, [hora]);

  const set = <K extends keyof TurnFormValues>(key: K, value: TurnFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ ...values, mascota: values.mascota.trim(), tutor: values.tutor.trim(), motivo: values.motivo.trim() });
  };

  return (
    <form className="panel form" onSubmit={handleSubmit} aria-labelledby="new-turn-title">
      <h2 id="new-turn-title">Nuevo turno</h2>

      <div className="field">
        <span className="field-label">Profesional y horario</span>
        <p className="field-static">
          {profesional} · {fecha} · {hora}
        </p>
      </div>

      <div className="field">
        <label htmlFor="mascota">Mascota</label>
        <input
          id="mascota"
          ref={firstField}
          required
          placeholder="Ej.: Toby (perro)"
          value={values.mascota}
          onChange={(e) => set("mascota", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="tutor">Tutor</label>
        <input
          id="tutor"
          required
          placeholder="Nombre y apellido"
          value={values.tutor}
          onChange={(e) => set("tutor", e.target.value)}
        />
      </div>

      <div className="field">
        <label htmlFor="motivo">Motivo</label>
        <input id="motivo" value={values.motivo} onChange={(e) => set("motivo", e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="duracion">Duración</label>
        <select
          id="duracion"
          value={values.duracionMinutos}
          onChange={(e) => set("duracionMinutos", Number(e.target.value))}
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d} min
            </option>
          ))}
        </select>
      </div>

      {errors.length > 0 && (
        <div className="form-error" role="alert">
          {errors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Guardando…" : "Confirmar"}
        </button>
      </div>
    </form>
  );
}
