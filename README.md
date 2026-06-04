# BonTrack — MVP (Sprint 01: Trazabilidad de endosos)

Prototipo para el TSE: convierte 8–9 meses de auditoría manual de bonos de deuda
política en una consulta de segundos. La cadena de custodia de cada bono vive
**on-chain** (Stellar/Soroban, inmutable); Supabase es un índice/caché reconstruible.

Fuente de verdad del producto: `../BonTrackContext/context/`.

## Estructura

```
BonTrack/
  contracts/        Contrato Soroban NFT (OpenZeppelin, upgradeable) — Rust
    contracts/bono_nft/   BonoNFT: metadata on-chain + transfer_con_precio (R19)
    deployment.testnet.json
  web/              App Next.js (App Router) — UI + API routes + integración Stellar/Supabase
```

## Estado

- ✅ Contrato `BonoNFT` escrito, testeado (`cargo test`) y **desplegado en testnet**
  - Contract ID: `CBCMZ5LYDCZHA7VFC5UT5EOYVCUN3ZUK3YWYJV6RW4RJYCEB763NOSKR`
- ✅ App Next.js completa y compilando (`npm run build`): login, TEN-1, TEN-2,
  TSE-3, PUB-1, vista partido, API de transferencia/trazabilidad/seed.
- ⏳ Falta conectar Supabase (credenciales cloud), aplicar el schema y correr el seed.

## Contrato (ya hecho)

```bash
cd contracts
export PATH="$HOME/.local/bin:$PATH"
cargo test              # 4 tests
stellar contract build  # WASM
```

## Web — puesta en marcha

1. **Credenciales Supabase** — completar en `web/.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   (Los valores de Stellar y la clave de cifrado ya están puestos.)

2. **Aplicar el schema** — pegar `web/supabase/migrations/0001_init.sql` en el
   SQL Editor del proyecto Supabase y ejecutarlo. (Alternativa: `psql "$DB_URL" -f web/supabase/migrations/0001_init.sql`.)

3. **Instalar y correr**:
   ```bash
   cd web
   npm install
   npm run dev
   ```

4. **Seed** (mintea 10 bonos, los coloca a tenedores iniciales, crea los logins):
   ```bash
   curl -X POST http://localhost:3000/api/seed -H "x-seed-secret: $SEED_SECRET"
   ```
   (El `SEED_SECRET` está en `web/.env.local`.)

### Logins del demo (tras el seed) — contraseña `Bontrack2026!`

| Rol     | Correo               |
|---------|----------------------|
| TSE     | `tse@bontrack.cr`    |
| Partido | `pln@bontrack.cr`    |
| Tenedor | `carlos@bontrack.cr` |
| Tenedor | `maria@bontrack.cr`  |

### Demo (end-to-end)

1. `carlos@bontrack.cr` → TEN-1 → Transferir el bono #4 a María (₡950,000).
2. `tse@bontrack.cr` → Trazabilidad → PLN / A / 4 → ve la cadena PLN → Carlos → María.
3. Sin login (`/`) → misma consulta pública (PUB-1).

## Modelo técnico

- **Wallets custodiales**: el backend crea/fondea (Friendbot) un keypair por
  usuario; la llave secreta se cifra (AES-256-GCM) en Supabase y el backend firma
  por el usuario. Nadie ve llaves.
- **Endoso on-chain**: `transfer_con_precio(de, a, token_id, precio)` extiende el
  transfer de OZ y emite un evento con partes + precio + timestamp (R19).
- **Trazabilidad**: se sirve del índice de eventos en Supabase (rápido), espejo
  verificable de la cadena.
