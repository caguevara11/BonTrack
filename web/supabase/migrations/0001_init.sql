-- BonTrack — esquema off-chain (Supabase / Postgres).
-- Supabase es CACHÉ/índice reconstruible de lo que vive on-chain + auth + custodia
-- de wallets. La cadena (contrato Soroban) es la fuente de verdad.

create extension if not exists pgcrypto;

-- ── Custodia de wallets (llave secreta cifrada AES-256-GCM) ──────────────────
create table if not exists wallets (
  id            uuid primary key default gen_random_uuid(),
  public_key    text not null unique,
  secret_cipher text not null,
  secret_iv     text not null,
  secret_tag    text not null,
  funded        boolean not null default true,
  label         text,
  created_at    timestamptz not null default now()
);

-- ── Partidos (catálogo seed) ─────────────────────────────────────────────────
create table if not exists partidos (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null,
  slug          text not null unique,
  tipo_eleccion text not null default 'presidencial'
                 check (tipo_eleccion in ('presidencial','municipal')),
  wallet_id     uuid references wallets(id),
  created_at    timestamptz not null default now()
);

-- ── Tenedores (holders) — cada uno con su wallet custodial ───────────────────
-- persona: nombre+cedula propios. banco/medio: entidad + representante legal (su cédula).
create table if not exists holders (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null check (tipo in ('persona','banco','medio')),
  nombre        text not null,
  cedula        text not null,
  entidad       text,
  representante text,
  wallet_id     uuid references wallets(id),
  created_at    timestamptz not null default now()
);
create index if not exists holders_cedula_idx on holders (cedula);

-- ── Perfiles de auth (1:1 con auth.users) ────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('tse','partido','tenedor')),
  display_name text not null,
  partido_id   uuid references partidos(id),
  holder_id    uuid references holders(id),
  created_at   timestamptz not null default now()
);

-- ── Bonos: caché/índice de la metadata + dueño actual on-chain ───────────────
create table if not exists bonos (
  token_id            integer primary key,
  partido             text not null,
  serie               text not null,
  numero              integer not null,
  valor_nominal       numeric not null,
  fecha_emision       date not null,
  partido_id          uuid references partidos(id),
  current_owner_pubkey text not null,
  estado              text not null default 'EMITIDO'
                       check (estado in ('EMITIDO','COLOCADO','REDIMIDO','ANULADO')),
  contract_id         text not null,
  updated_at          timestamptz not null default now()
);
create unique index if not exists bonos_identidad_idx on bonos (partido, serie, numero);

-- ── Eventos: caché/índice del historial de endosos on-chain ──────────────────
create table if not exists eventos (
  id            uuid primary key default gen_random_uuid(),
  token_id      integer not null references bonos(token_id),
  tipo          text not null check (tipo in ('EMISION','COLOCACION','ENDOSO')),
  from_pubkey   text,
  to_pubkey     text not null,
  from_label    text,
  to_label      text not null,
  precio        numeric,
  ts            timestamptz not null,
  tx_hash       text,
  registrado_por text,
  created_at    timestamptz not null default now()
);
create index if not exists eventos_token_idx on eventos (token_id, ts);

-- ── RLS: todo el acceso de negocio pasa por el backend (service_role, bypassa RLS).
-- Habilitamos RLS sin políticas → deny por defecto para anon/authenticated. Las
-- wallets (secretos) nunca son legibles desde el cliente. La trazabilidad pública
-- (PUB-1) se sirve desde API routes con service_role.
alter table wallets  enable row level security;
alter table partidos enable row level security;
alter table holders  enable row level security;
alter table profiles enable row level security;
alter table bonos    enable row level security;
alter table eventos  enable row level security;
