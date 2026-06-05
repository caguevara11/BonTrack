-- Sprint 02: solicitudes de emisión reales.

create table if not exists emission_requests (
  id             uuid primary key default gen_random_uuid(),
  partido_id     uuid not null references partidos(id),
  serie          text not null,
  cantidad       integer not null check (cantidad > 0),
  valor_nominal  numeric not null check (valor_nominal > 0),
  estado         text not null default 'PENDIENTE'
                 check (estado in ('PENDIENTE','APROBADA','RECHAZADA')),
  motivo_rechazo text,
  requested_by   uuid references profiles(id),
  reviewed_by    uuid references profiles(id),
  requested_at   timestamptz not null default now(),
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists emission_requests_partido_idx
  on emission_requests (partido_id, requested_at desc);

create index if not exists emission_requests_estado_idx
  on emission_requests (estado, requested_at asc);

alter table emission_requests enable row level security;
