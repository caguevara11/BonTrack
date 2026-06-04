# Sprint-01 — Revisión: qué se hizo vs. el pack + wireframes, y plan de arreglo

> Estado: el **flujo funciona end-to-end y verificado** (contrato en testnet, seed,
> endoso real on-chain, trazabilidad índice==cadena). Lo que sigue es un pase de
> **calidad/arquitectura/UI** usando las skills y MCPs que NO se aprovecharon en la
> primera pasada, + cerrar gaps de fidelidad con los wireframes.

## 0. Actualización post-review

Estado actual: la mayor parte del backlog UI/arquitectura de esta review ya se
cerró. También quedó actualizado el contrato en testnet y reconciliado el índice
Supabase contra la cadena.

**Cerrado después de la review original:**
- shadcn/Radix, tokens visuales, tipografía institucional, Motion y estados base.
- TSE-3/PUB-1 con modo "por partido" y dropdowns Partido/Serie.
- TEN-1 con nombre + cédula y descuento de adquisición.
- TanStack Query en búsquedas/mutaciones cliente.
- `React.cache` en `getCurrentActor`, eventos en lote para evitar N+1.
- `loading.tsx`, `error.tsx`, `not-found.tsx` y metadata por rutas principales.
- Contrato: `transfer`/`transfer_from` directos ahora revierten; todo cambio de
  tenedor debe pasar por `transfer_con_precio`.
- Contrato: eventos propios migrados a `#[contractevent]`.
- Trazabilidad: `GET /api/trazabilidad?...&verify=chain` verifica metadata y
  tenedor actual contra Stellar; `/api/trazabilidad/reconcile` audita todo el
  índice Supabase contra on-chain.
- Testnet: contrato actualizado vía `upgrade` al WASM
  `c385a80219ab3bb17abb7dec47670ece96c8c0ad584b70b9369220d01e96271f`;
  reconciliación del ambiente sembrado: 10/10 bonos OK, 0 desalineados.

**Pendiente real ahora:**
- Agregar reset reproducible del demo.
- Agregar caso preparado de rechazo por extranjero/R2 en el demo.
- Resolver warning de Next por múltiples lockfiles o configurar `turbopack.root`.

---

## 1. Resumen de lo construido

**Contrato (`contracts/contracts/bono_nft`)** — Rust/Soroban, OpenZeppelin `stellar-tokens` **0.7.1** (la última), upgradeable vía `Ownable`.
- `mint_bono`, `transfer_con_precio(de,a,token_id,precio)` (precio>0 → evento endoso con partes+precio+timestamp), `owner_of`, `get_bono`, metadata on-chain.
- `transfer` y `transfer_from` del trait NFT revierten para forzar R19 a nivel contrato.
- 6 tests pasan. Desplegado en testnet: `CBCMZ5LYDCZHA7VFC5UT5EOYVCUN3ZUK3YWYJV6RW4RJYCEB763NOSKR`; actualizado con `upgrade` el 2026-06-04.

**App (`web/`)** — Next.js 16 App Router, TS, Tailwind v4, shadcn/Radix, TanStack Query y Motion.
- `lib/`: stellar (sdk 15), crypto (AES-256-GCM wallets custodiales), eligibility (R1–R5), db, wallets, auth, supabase (admin/server/client).
- API: `/api/transfer`, `/api/trazabilidad`, `/api/trazabilidad/reconcile`, `/api/catalogo`, `/api/seed`.
- Páginas: `/` (PUB-1), `/login`, `/inicio` (router por rol), `/tenedor` (TEN-1), `/tenedor/transferir/[id]` (TEN-2), `/tse` (TSE-3), `/partido`, `/bono/[id]`.
- Supabase: 6 tablas (`0001_init.sql`), Auth, custodia de wallets.

**Verificado:** seed (10 bonos + 5 colocaciones on-chain), endoso Carlos→María firmado por wallet custodial, índice==on-chain==María, rechazo R2 (extranjero) y R19 (precio), render de las páginas por rol.

---

## 2. Contra `prds/sprint-01.md` (MUST-HAVE y AC)

| Ítem sprint-01 | Estado |
|---|---|
| Contrato NFT OZ upgradeable en testnet + metadata + `transfer_con_precio` | ✅ |
| Seed (N bonos colocados + eventos origen + wallets fondeadas) | ✅ |
| Login tenedor + TSE + partido | ✅ |
| TEN-1 / TEN-2 | ✅ funcional (gaps de fidelidad → §3) |
| Transferencia on-chain firmada por backend + elegibilidad | ✅ |
| Espejo de evento en Supabase | ✅ |
| TSE-3 (por bono, cédula y partido) | ✅ |
| PUB-1 sin login | ✅ |
| Vista partido filtrada a sus bonos | ✅ |
| AC-3.1–3.5 / AC-4.1–4.4 | ✅ todos verificados |

**Correctamente fuera de scope (sprint-02, fingido por seed):** emisión real (PAR-2), aprobación TSE (TSE-1/TSE-2), colocación UI (PAR-3), notificaciones, freeze/ANULADO, redención.

---

## 3. Wireframes vs. lo construido (fidelidad)

- **TEN-1 (Mis Bonos):** ✅ tarjetas con partido/serie/#/valor/fecha/precio/estado + [Ver historial][Transferir] + estado vacío + header nombre/cédula + detalle "(desc. 10%)".
- **TEN-2 (Transferir):** ✅ encabezado del bono, selector persona/banco/medio con campos dinámicos, precio obligatorio, nota informativa, [Cancelar][Confirmar]. Fiel.
- **TSE-3 (Trazabilidad):** ✅ 3 modos (bono / cédula / partido), Partido/Serie como dropdowns, resultado + historial.
- **PUB-1 (Público):** ✅ título/portal, modos de búsqueda, dropdowns, resultado = TSE-3, footer legal.
- **Partido (PAR-1):** ✅ contadores (EMITIDOS/COLOCADOS/pendientes) + actividad reciente + lista de bonos con tenedor/estado. El nav a "Solicitar Emisión"/"Colocar" es sprint-02.

---

## 4. Lo que NO se aprovechó en la 1ª pasada (estado actualizado)

1. **UI/diseño/shadcn/Motion** → cerrado.
2. **TSE-3/PUB-1/TEN-1 fidelidad wireframes** → cerrado.
3. **React/Next perf básico** → cerrado: TanStack Query, `React.cache`, eventos en lote, loading/error/not-found.
4. **OpenZeppelin/Soroban** → cerrado en código: `transfer`/`transfer_from` revierten y eventos propios usan `#[contractevent]`.
5. **Trazabilidad verificable** → cerrado en código: verificación por bono y reconciliación del índice completo.
6. **Pendiente operativo** → redeploy/upgrade en testnet, ejecutar reconciliación en ambiente sembrado, reset de demo y caso de rechazo R2.

---

## 5. Prompt de arreglo (para la próxima pasada)

> **Pegar este prompt para el pase de calidad. No reescribir la lógica que ya
> funciona; mejorar arquitectura + UI + fidelidad usando las skills/MCPs.**

```
Vamos a hacer un pase de CALIDAD sobre BonTrack (sprint-01 ya funciona end-to-end;
no rompas la lógica verificada: contrato, seed, /api/transfer, trazabilidad).
Fuente de verdad de producto: ../BonTrackContext/context (sobre todo prds/sprint-01.md
y wireframes/). Trabajá una tarea a la vez de docs/sprint-01-review.md §6.

OBLIGATORIO usar las herramientas disponibles (no las ignores como en la 1ª pasada):
- ANTES de tocar cualquier UI/CSS/cliente: corré `modern-web-guidance` (search) para
  el patrón concreto (formularios, dialog/popover, inputs, validación, view transitions).
- Diseño: aplicá la skill `frontend-design`. Dirección estética: registro público
  INSTITUCIONAL del TSE — confiable, refinado, claro; tipografía distintiva (no
  Inter/Arial/Geist por defecto), paleta cohesiva con un acento, micro-interacciones
  con la librería Motion, jerarquía y espaciado cuidados. Nada de "AI slop".
- Componentes: instalá y usá **shadcn** (Radix base) — reemplazá components/ui.tsx.
  Seguí `vercel-composition-patterns` (compound components, evitar boolean props).
- React/Next: aplicá `next-best-practices` y `vercel-react-best-practices`
  (Suspense/streaming, parallel fetching, React.cache, loading/error/not-found,
  metadata por ruta). Consultá node_modules/next/dist/docs para APIs de Next 16.
- Contrato: revisá con `openzeppelin-skills` / `stellar-dev-skill`; confirmá que
  estamos en la última versión de stellar-contracts y evaluá exponer solo
  transfer_con_precio.
- Construí CADA pantalla con el wireframe correspondiente como base 1:1
  (TEN-1, TEN-2, TSE-3, PUB-1, vista partido) y cerrá los gaps de §3.
- Supabase: el MCP de Supabase ya está disponible — usalo para migraciones/queries
  en vez de scripts pg ad-hoc.

Verificá cada cambio corriendo la app (skill `run`/`verify`) y sin romper los AC-3/AC-4.
```

---

## 6. Backlog priorizado (una tarea a la vez — NO todo junto)

**P1 — UI/Diseño (mayor impacto para el demo al TSE)**
- [x] Setup shadcn (Radix) + tokens de diseño + tipografía/paleta institucional.
- [x] Layout/Header/Footer consistentes + estados loading/empty/error con buena UX.
- [x] Reconstruir TEN-1, TEN-2, TSE-3, PUB-1, vista partido fieles al wireframe con shadcn + Motion.

**P2 — Fidelidad de wireframes (gaps §3)**
- [x] TSE-3/PUB-1: agregar modo "por partido" + dropdowns de Partido/Serie poblados desde datos.
- [x] TEN-1: header con nombre + cédula; detalle de descuento.

**P3 — Arquitectura (skills next/react)**
- [x] `loading.tsx`/`error.tsx`/`not-found.tsx`, metadata por ruta.
- [x] Eliminar N+1: una sola query de eventos para listas; `React.cache` en `getCurrentActor`.
- [x] TanStack Query para búsqueda/mutación en cliente (dedup/estados).

**P4 — Contrato**
- [x] Review OZ: `transfer`/`transfer_from` directos revierten para forzar R19 on-chain.
- [x] Migrar eventos propios a `#[contractevent]`.
- [x] Redeploy/upgrade en testnet y actualizar `deployment.testnet.json` con WASM activo.

**P5 — Demo/infra (opcional)**
- [ ] Caso de transferencia rechazada por extranjero en el seed/demo (para mostrar la validación).
- [ ] Script de reset del estado del demo; usar MCP de Supabase para migraciones.
- [x] Endpoint protegido de reconciliación Supabase ↔ on-chain (`/api/trazabilidad/reconcile`).
- [x] Ejecutar reconciliación contra Supabase testnet: 10/10 bonos OK, 0 desalineados.

**Explícitamente NO ahora (sprint-02):** emisión real, aprobación TSE, colocación UI, notificaciones, freeze/ANULADO, redención.
```
