// Agenda de turnos de Patitas: HTML + JavaScript sin frameworks.
// Habla con la misma API que se prueba con Postman (GET /profesionales,
// GET /profesionales/:id/disponibilidad y POST /turnos).

const SLOT = 30; // minutos por bloque de la agenda

// Estado de la pantalla
let profesionales = [];
let profesionalActual = null;
let fecha = fechaISO(new Date());
let horaSeleccionada = null;

// Referencias al HTML
const $ = (id) => document.getElementById(id);
const tabs = $("profesionales");
const agenda = $("agenda");
const formulario = $("formulario");

// ---------- Utilidades de fechas y horas ----------

/** Date -> "2026-11-13" (fecha local, no UTC) */
function fechaISO(d) {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

function dosDigitos(n) {
  return String(n).padStart(2, "0");
}

function sumarDias(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  return fechaISO(new Date(a, m - 1, d + dias));
}

/** "2026-11-13" -> "Viernes 13/11" */
function textoFecha(iso) {
  const [a, m, d] = iso.split("-").map(Number);
  const dia = new Date(a, m - 1, d).toLocaleDateString("es-AR", { weekday: "long" });
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${dosDigitos(d)}/${dosDigitos(m)}`;
}

/** "09:30" -> 570 */
function aMinutos(hora) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 570 -> "09:30" */
function aHora(minutos) {
  return `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`;
}

/** "Dra. Laura Gómez" -> "Dra. Gómez" */
function nombreCorto(nombre) {
  const partes = nombre.split(" ");
  return partes.length > 2 ? `${partes[0]} ${partes[partes.length - 1]}` : nombre;
}

// ---------- Llamadas a la API ----------

async function pedir(url, opciones = {}) {
  let res;
  try {
    res = await fetch(url, { ...opciones, headers: { "Content-Type": "application/json" } });
  } catch {
    throw { status: 0, mensaje: "No se pudo conectar con la API." };
  }
  const cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, mensaje: cuerpo.error, detalle: cuerpo.detalle };
  return cuerpo;
}

// ---------- Avisos ----------

function mostrarAviso(tipo, texto) {
  const aviso = $("aviso");
  aviso.className = `notice notice-${tipo}`;
  aviso.setAttribute("role", tipo === "success" ? "status" : "alert");
  $("aviso-texto").textContent = texto;
  aviso.hidden = false;
}

function ocultarAviso() {
  $("aviso").hidden = true;
}

// ---------- Dibujar la pantalla ----------

function dibujarPestanias() {
  tabs.replaceChildren();
  for (const p of profesionales) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "tab";
    boton.setAttribute("role", "tab");
    boton.setAttribute("aria-selected", p.id === profesionalActual.id);
    boton.title = p.especialidad;
    boton.textContent = nombreCorto(p.nombre);
    boton.addEventListener("click", () => {
      profesionalActual = p;
      cargarAgenda();
    });
    tabs.append(boton);
  }
}

/** Crea una fila de la agenda: la hora a la izquierda y el bloque a la derecha. */
function fila(hora, bloque) {
  const li = document.createElement("li");
  li.className = "agenda-row";
  const etiqueta = document.createElement("span");
  etiqueta.className = "agenda-time";
  etiqueta.textContent = hora;
  li.append(etiqueta, bloque);
  return li;
}

function bloqueOcupado(turno, bloques) {
  const div = document.createElement("div");
  div.className = "slot slot-busy";
  div.style.setProperty("--slots", bloques);
  const titulo = document.createElement("strong");
  titulo.textContent = [turno.mascota, turno.tutor, turno.motivo].filter(Boolean).join(" · ");
  div.append(titulo);
  if (turno.duracionMinutos !== SLOT) {
    const duracion = document.createElement("small");
    duracion.textContent = `${turno.duracionMinutos} minutos`;
    div.append(duracion);
  }
  return div;
}

function bloqueLibre(hora) {
  const boton = document.createElement("button");
  boton.type = "button";
  const seleccionado = hora === horaSeleccionada;
  boton.className = `slot ${seleccionado ? "slot-selected" : "slot-free"}`;
  boton.setAttribute("aria-pressed", seleccionado);
  boton.textContent = seleccionado ? `${hora} · seleccionado` : "Libre";
  boton.addEventListener("click", () => seleccionarHorario(hora));
  return boton;
}

/**
 * Recorre el horario del profesional en bloques de 30 minutos.
 * Un turno ocupado se dibuja una sola vez y ocupa tantos bloques como dure
 * (un turno de 60 minutos ocupa dos). Solo los horarios libres son botones.
 */
function dibujarAgenda(datos) {
  agenda.replaceChildren();
  const vacia = $("agenda-vacia");
  vacia.hidden = true;

  if (!datos.atiende) {
    vacia.textContent = `${nombreCorto(profesionalActual.nombre)} no atiende este día. Probá con otra fecha u otro profesional.`;
    vacia.hidden = false;
    return;
  }

  profesionalActual.franjas.forEach((franja, i) => {
    if (i > 0) {
      const pausa = document.createElement("li");
      pausa.className = "agenda-pause";
      pausa.setAttribute("aria-hidden", "true");
      pausa.append(document.createElement("span"));
      agenda.append(pausa);
    }

    const fin = aMinutos(franja.hasta);
    let inicio = aMinutos(franja.desde);
    while (inicio + SLOT <= fin) {
      const turno = datos.ocupados.find((t) => {
        const desde = aMinutos(t.hora);
        return desde < inicio + SLOT && inicio < desde + t.duracionMinutos;
      });

      if (turno) {
        const termina = Math.min(aMinutos(turno.hora) + turno.duracionMinutos, fin);
        const bloques = Math.max(1, Math.ceil((termina - inicio) / SLOT));
        agenda.append(fila(aHora(inicio), bloqueOcupado(turno, bloques)));
        inicio += bloques * SLOT;
      } else {
        const hora = aHora(inicio);
        if (datos.disponibles.includes(hora)) agenda.append(fila(hora, bloqueLibre(hora)));
        inicio += SLOT;
      }
    }
  });

  if (datos.disponibles.length === 0) {
    vacia.textContent = "No quedan horarios libres. Probá con otra fecha u otro profesional.";
    vacia.hidden = false;
  }
}

function mostrarFormulario(visible) {
  formulario.hidden = !visible;
  $("ayuda").hidden = visible;
  $("errores").hidden = true;
}

// ---------- Acciones ----------

let ultimaAgenda = null;

async function cargarAgenda() {
  horaSeleccionada = null;
  mostrarFormulario(false);
  dibujarPestanias();
  $("fecha").textContent = textoFecha(fecha);
  try {
    ultimaAgenda = await pedir(`/profesionales/${profesionalActual.id}/disponibilidad?fecha=${fecha}`);
    dibujarAgenda(ultimaAgenda);
  } catch (error) {
    agenda.replaceChildren();
    mostrarAviso("error", error.mensaje);
  }
}

function seleccionarHorario(hora) {
  horaSeleccionada = hora;
  ocultarAviso();
  dibujarAgenda(ultimaAgenda);
  const [, m, d] = fecha.split("-");
  $("resumen").textContent = `${nombreCorto(profesionalActual.nombre)} · ${d}/${m} · ${hora}`;
  mostrarFormulario(true);
  $("mascota").focus();
}

async function confirmarTurno(evento) {
  evento.preventDefault();
  const boton = $("confirmar");
  boton.disabled = true;
  boton.textContent = "Guardando…";

  const turno = {
    profesionalId: profesionalActual.id,
    fecha,
    hora: horaSeleccionada,
    duracionMinutos: Number($("duracion").value),
    mascota: $("mascota").value.trim(),
    tutor: $("tutor").value.trim(),
    motivo: $("motivo").value.trim(),
  };

  try {
    const creado = await pedir("/turnos", { method: "POST", body: JSON.stringify(turno) });
    formulario.reset();
    await cargarAgenda();
    mostrarAviso("success", `Turno registrado: ${creado.mascota} a las ${creado.hora}.`);
  } catch (error) {
    if (error.status === 409) {
      // Otra persona ocupó el horario mientras se cargaban los datos (regla de negocio).
      // Se conservan los datos escritos y se vuelve a mostrar la agenda actualizada.
      await cargarAgenda();
      mostrarAviso("warning", `${error.mensaje}. Elegí otro horario libre.`);
    } else {
      const errores = $("errores");
      const lineas = [error.mensaje, ...(Array.isArray(error.detalle) ? error.detalle : [])];
      errores.replaceChildren(
        ...lineas.map((texto) => {
          const p = document.createElement("p");
          p.textContent = texto;
          return p;
        })
      );
      errores.hidden = false;
    }
  } finally {
    boton.disabled = false;
    boton.textContent = "Confirmar";
  }
}

// ---------- Eventos ----------

$("dia-anterior").addEventListener("click", () => {
  fecha = sumarDias(fecha, -1);
  cargarAgenda();
});
$("dia-siguiente").addEventListener("click", () => {
  fecha = sumarDias(fecha, 1);
  cargarAgenda();
});
$("hoy").addEventListener("click", () => {
  fecha = fechaISO(new Date());
  cargarAgenda();
});
$("aviso-cerrar").addEventListener("click", ocultarAviso);
$("cancelar").addEventListener("click", () => {
  horaSeleccionada = null;
  mostrarFormulario(false);
  dibujarAgenda(ultimaAgenda);
});
formulario.addEventListener("submit", confirmarTurno);

// ---------- Inicio ----------

pedir("/profesionales")
  .then((lista) => {
    profesionales = lista;
    profesionalActual = lista[0];
    cargarAgenda();
  })
  .catch((error) => mostrarAviso("error", error.mensaje));
