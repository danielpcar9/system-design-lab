export type OptionOverlay = { title: string; body: string };

export const CAP_ES: Record<string, OptionOverlay> = {
  cp: {
    title: "CP — consistencia primero",
    body: "Rechaza writes si la réplica o el quorum va atrás. Correcto para ledgers, trips, unicidad de short-links. La disponibilidad baja bajo partición.",
  },
  ap: {
    title: "AP — disponibilidad primero",
    body: "Sigue sirviendo, repara después. Correcto para presence, fan-out de feed, pings de location. Los readers pueden ver last-write-wins.",
  },
};

export const CACHE_ES: Record<string, OptionOverlay> = {
  aside: {
    title: "Cache-aside",
    body: "La app lee cache, en miss carga SQL y hace SET. Tú eres dueño del bust-on-write. Default para hot keys de redirect y timelines.",
  },
  through: {
    title: "Write-through",
    body: "Los writes van a cache y SQL en el mismo request. Writes más lentos, menos ghosts. Bien cuando la fila no debe desaparecer.",
  },
  back: {
    title: "Write-back",
    body: "Los writes hacen ack contra cache; un flusher pega SQL después. p50 rápido, durabilidad débil. Counters sí, payments no.",
  },
};

export const ORM_ES: Record<string, OptionOverlay> = {
  "active-record": {
    title: "Active Record",
    body: "El modelo es la fila. Default de Rails. Alta velocidad, N+1 si olvidas includes, los callbacks disparan en cada save.",
  },
  "data-mapper": {
    title: "Data Mapper",
    body: "SQLAlchemy 2.0 / Pydantic. El statement es la query. Más typing, menos queries sorpresa, mejor bajo el motor de stress a alto RPS.",
  },
};

export const SCALE_ES: Record<string, OptionOverlay> = {
  vertical: {
    title: "Vertical",
    body: "Caja más grande, más workers Puma/Uvicorn en un host. Barato hasta que la caja es el bottleneck. El motor de stress lo dirá.",
  },
  horizontal: {
    title: "Horizontal",
    body: "Más hosts detrás del Load Balancer, JWT stateless o sticky cookies. Cuesta más, sobrevive a una caja que muere.",
  },
};
