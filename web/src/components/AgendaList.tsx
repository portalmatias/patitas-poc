import type { AgendaRow } from "../agenda";

interface Props {
  rows: AgendaRow[];
  selected: string | null;
  onSelect: (hora: string) => void;
}

// Presentational: only free slots are buttons, so an occupied slot cannot be picked.
export function AgendaList({ rows, selected, onSelect }: Props) {
  return (
    <ol className="agenda" aria-label="Horarios del día">
      {rows.map((row) => {
        if (row.kind === "pausa") {
          return (
            <li key={`pausa-${row.hora}`} className="agenda-pause" aria-hidden="true">
              <span />
            </li>
          );
        }

        if (row.kind === "ocupado") {
          const { turno } = row;
          return (
            <li key={`t-${turno.id}`} className="agenda-row" style={{ ["--slots" as string]: row.slots }}>
              <span className="agenda-time">{row.hora}</span>
              <div className="slot slot-busy" aria-label={`${row.hora} ocupado: ${turno.mascota}, ${turno.tutor}`}>
                <strong>
                  {turno.mascota} · {turno.tutor}
                  {turno.motivo && ` · ${turno.motivo}`}
                </strong>
                {turno.duracionMinutos !== 30 && <small>{turno.duracionMinutos} minutos</small>}
              </div>
            </li>
          );
        }

        const isSelected = selected === row.hora;
        return (
          <li key={row.hora} className="agenda-row">
            <span className="agenda-time">{row.hora}</span>
            <button
              type="button"
              className={`slot ${isSelected ? "slot-selected" : "slot-free"}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(row.hora)}
            >
              {isSelected ? <strong>{row.hora} · seleccionado</strong> : "Libre"}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Legend() {
  return (
    <ul className="legend" aria-label="Referencias">
      <li>
        <span className="swatch slot-busy" aria-hidden="true" /> Ocupado
      </li>
      <li>
        <span className="swatch slot-free" aria-hidden="true" /> Libre
      </li>
      <li>
        <span className="swatch slot-selected" aria-hidden="true" /> Seleccionado
      </li>
    </ul>
  );
}
