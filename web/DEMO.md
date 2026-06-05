# BonTrack — Guía de demo (value loop)

Guía para probar los flujos y grabar el video demo. El seed deja **2 partidos
llenos** (PLN, PUSC) y **1 vacío** (Nueva República) para mostrar el ciclo
completo de emisión real.

- **App:** `http://localhost:3000` — levantar con `cd web && npm run dev`
- **Login:** `/login` · **Vista pública:** `/`
- **Contraseña de todos los usuarios:** `Bontrack2026!`

---

## 1. Usuarios

| Email | Rol | Panel | Qué tiene hoy |
|---|---|---|---|
| `tse@bontrack.cr` | TSE | `/tse` | Aprueba/rechaza emisiones + busca trazabilidad |
| `pln@bontrack.cr` | Partido PLN (lleno) | `/partido` | 10 bonos (7 colocados, 3 EMITIDO: A#8,#9,#10) |
| `pusc@bontrack.cr` | Partido PUSC (lleno) | `/partido` | 8 bonos (5 colocados, 3 EMITIDO: A#6,#7,#8) |
| `pnr@bontrack.cr` | Partido **Nueva República (vacío)** | `/partido` | Sin bonos → demo de emisión real |
| `carlos@bontrack.cr` | Tenedor — Carlos Pérez (`112345678`) | `/tenedor` | Posee PUSC A#5 |
| `maria@bontrack.cr` | Tenedor — María Rodríguez (`309876543`) | `/tenedor` | Posee PLN A#4 y PUSC A#4 |

> Solo Carlos y María tienen login de tenedor. José, Ana, Luis, los bancos y
> Teletica existen como tenedores (se les puede transferir por cédula) pero no
> tienen cuenta — no hace falta para que aparezcan en la cadena.

**Cédulas para colocar/endosar:**
Banco BCT `3101123456` · Banco Nacional `3101000123` · Teletica (medio)
`3101998877` · Carlos `112345678` · María `309876543` · José `207650981` ·
Ana `401230567` · Luis `503210456`

---

## 2. Vistas

- **`/`** — Buscador público (sin login). Por **bono** (partido+serie+#) o por **cédula**.
- **`/bono/[id]`** — **Historial completo de custodia**: EMISIÓN → COLOCACIÓN →
  ENDOSO(s), cada evento con fecha, partes, precio y link a **stellar.expert**.
- **`/partido`** — Solicitar emisión, ver solicitudes (estado/motivo), contador
  de EMITIDO, "Mis bonos" con botón **Colocar** en los EMITIDO.
- **`/tse`** — Solicitudes PENDIENTE con **Aprobar y mintear** / **Rechazar (+motivo)**
  + buscador de trazabilidad.
- **`/tenedor`** — "Mis bonos" con **Ver historial** y **Transferir**.

---

## 3. Los 4 flujos

| Flujo | Quién | Qué hace | Qué cambia |
|---|---|---|---|
| **1. Emisión** | Partido → TSE | Solicita (serie, cantidad, valor); TSE aprueba/rechaza | Aprobar → **mintea N tokens on-chain** → **EMITIDO** |
| **2. Colocación** | Partido | Asigna un EMITIDO a su primer tenedor (cédula + precio) | EMITIDO → **COLOCADO** |
| **3. Endoso** | Tenedor | Transfiere a otro tenedor (cédula + precio obligatorio) | Sigue COLOCADO, cambia tenedor; evento on-chain |
| **4. Consulta** | TSE / Público | Busca por bono o cédula | Solo lectura → **cadena completa en segundos** |

El **wedge**: cada endoso queda inmutable y auditable → la trazabilidad que hoy
toma 8–9 meses, en tiempo real.

---

## 4. Guión del video (value loop de punta a punta)

Seguimos **un solo bono nuevo** desde que nace hasta que pasa por varias manos,
logueándonos como cada actor. Usamos **Nueva República** (arranca vacío).

**Escena 0 — El problema (10s).**
Abrí `/` (público). Mostrá el buscador y "Ver contrato en Blockchain".
*"Hoy el TSE no sabe quién tiene cada bono de deuda política. Esto lo resuelve."*

**Escena 1 — El partido solicita (Flujo 1).**
Login `pnr@bontrack.cr` → `/partido` → "Solicitar bonos al TSE": Serie `A`,
Cantidad `5`, Valor nominal `1000000` → Enviar. Queda en **PENDIENTE**.

**Escena 2 — El TSE aprueba y se mintea (Flujo 1).**
Login `tse@bontrack.cr` → `/tse` → solicitud de Nueva República → **Aprobar y
mintear**. Toast: "5 bonos quedaron emitidos." *(Minteo real on-chain.)*
> Opcional: en otra solicitud mostrá **Rechazar** con motivo; en `/partido` se ve
> la solicitud RECHAZADA con el motivo (AC-1.4/1.5).

**Escena 3 — El partido coloca (Flujo 2).**
`pnr@` → `/partido` → "Mis bonos": 5 EMITIDO → en el **#1** tocá **Colocar** →
tipo Persona, cédula `309876543` (María), precio `950000` → Confirmar. Pasa a
**COLOCADO**.
> Opcional: probá colocar a una cédula extranjera inválida (ej. `999`) → el
> sistema **rechaza por elegibilidad** (R2).

**Escena 4 — Endoso entre tenedores (Flujo 3) — "varios usuarios".**
- Login `maria@bontrack.cr` → `/tenedor` → bono nuevo → **Transferir** → Persona,
  cédula `112345678` (Carlos), precio `980000`.
- Login `carlos@bontrack.cr` → `/tenedor` → ahora lo tiene él → **Transferir** →
  Banco, cédula `3101123456`, razón social `Banco BCT`, precio `1000000`.

Pasó por: partido → María → Carlos → Banco BCT. Tres traspasos en cámara.

**Escena 5 — El cierre: trazabilidad instantánea (Flujo 4).**
Logout → `/` → buscá por bono: **Nueva República**, Serie **A**, # **1** → **Ver
historial**. Cadena completa: EMISIÓN → COLOCACIÓN → ENDOSO → ENDOSO, con fechas,
partes, precios y "verificar en la cadena".
*"Cada traspaso, inmutable y público. Lo que tardaba 8–9 meses, ahora es instantáneo."*

> Variante: buscá por **cédula** (ej. `309876543`) y mostrá todos los bonos que
> tocó esa persona.

---

## 5. Checklist antes de grabar

1. **Emisión OK** — `pnr@` solicita → `tse@` aprueba → EMITIDO en `/partido`. *(Flujo 1 / AC-1.1–1.3)*
2. **Rechazo** — `tse@` rechaza con motivo → `pnr@` lo ve en RECHAZADA. *(AC-1.4/1.5)*
3. **Colocación** — colocá a una persona; probá cédula inválida (rechazo) y un banco. *(Flujo 2 / AC-2.1–2.3)*
4. **Endoso encadenado** — `maria@` → Carlos → `carlos@` → Banco. *(Flujo 3)*
5. **Historial** — `/bono/[id]` y `/` muestran la cadena con links a stellar.expert. *(Flujo 4)*
6. **Datos pre-sembrados** — buscá `PLN / A / 5` para una cadena ya rica
   (PLN → Carlos → José → Ana) sin construirla en vivo.

---

## 6. Re-sembrar (si hace falta resetear)

El seed se salta si ya hay bonos (`if bonos > 0 → skip`). Para re-sembrar hay que
truncar primero las tablas de demo (`eventos, bonos, emission_requests, holders,
partidos, wallets, profiles`) y luego:

```bash
curl -X POST http://localhost:3000/api/seed -H "x-seed-secret: $SEED_SECRET"
```
