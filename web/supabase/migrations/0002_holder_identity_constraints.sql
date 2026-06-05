-- Normalización mínima de identidad de tenedores:
-- personas físicas por cédula física; bancos/medios por cédula jurídica.

drop index if exists holders_entidad_tipo_unique_idx;

create unique index if not exists holders_tipo_cedula_unique_idx on holders (tipo, cedula);
