#![no_std]

//! # BonoNFT — Bonos de deuda política tokenizados (BonTrack)
//!
//! Un único contrato NFT (OpenZeppelin / Soroban, **upgradeable**) que administra
//! TODOS los bonos como `token_id`. Cada bono lleva su metadata inmutable on-chain
//! (`partido`, `serie`, `numero`, `valor_nominal`, `fecha_emision`).
//!
//! El endoso usa [`BonoNft::transfer_con_precio`], que extiende el `transfer` de
//! OpenZeppelin y emite un evento on-chain con partes + precio + timestamp. El
//! precio es **obligatorio** (regla de negocio R19).
//!
//! La cadena es la fuente de verdad; Supabase es solo un índice/caché reconstruible.

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, Address,
    BytesN, Env, String,
};
use stellar_access::ownable::{set_owner, Ownable};
use stellar_contract_utils::upgradeable::{self as upgradeable, Upgradeable};
use stellar_macros::only_owner;
use stellar_tokens::non_fungible::{Base, ContractOverrides, NonFungibleToken};

/// Errores del contrato.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BonoError {
    /// El precio del endoso es obligatorio y debe ser > 0 (R19).
    PrecioInvalido = 1,
    /// No existe un bono con ese `token_id`.
    BonoInexistente = 2,
    /// Las transferencias directas del NFT están deshabilitadas: usar `transfer_con_precio`.
    TransferDirectaNoPermitida = 3,
}

/// Metadata inmutable de un bono, almacenada on-chain en el storage del contrato.
/// El identificador legible (p. ej. `PLN-A-004`) se deriva de `partido + serie + numero`.
#[contracttype]
#[derive(Clone)]
pub struct Bono {
    pub partido: String,
    pub serie: String,
    pub numero: u32,
    pub valor_nominal: i128,
    pub fecha_emision: String,
}

#[contracttype]
pub enum DataKey {
    /// `token_id` -> [`Bono`] (metadata inmutable).
    Bono(u32),
}

/// Evento de origen del bono. El índice off-chain lo muestra como `[EMISIÓN]`.
#[contractevent(topics = ["emitido"])]
pub struct Emitido {
    #[topic]
    pub token_id: u32,
    pub to: Address,
    pub partido: String,
    pub serie: String,
    pub numero: u32,
    pub valor_nominal: i128,
}

/// Evento obligatorio para cualquier cambio de tenedor en BonTrack.
#[contractevent(topics = ["endoso"])]
pub struct Endoso {
    #[topic]
    pub token_id: u32,
    pub from: Address,
    pub to: Address,
    pub precio: i128,
    pub timestamp: u64,
}

#[contract]
pub struct BonoNft;

/// Reglas específicas de BonTrack sobre el NFT de OpenZeppelin.
///
/// El trait estándar sigue exponiendo `transfer`/`transfer_from`, pero ambas
/// entradas revierten. Así se conserva `owner_of`, metadata y compatibilidad de
/// lectura, mientras se fuerza que todo cambio de tenedor pase por
/// `transfer_con_precio` y emita precio on-chain (R19).
pub struct BonoTransferRules;

impl ContractOverrides for BonoTransferRules {
    fn transfer(e: &Env, _from: &Address, _to: &Address, _token_id: u32) {
        panic_with_error!(e, BonoError::TransferDirectaNoPermitida);
    }

    fn transfer_from(
        e: &Env,
        _spender: &Address,
        _from: &Address,
        _to: &Address,
        _token_id: u32,
    ) {
        panic_with_error!(e, BonoError::TransferDirectaNoPermitida);
    }
}

#[contractimpl]
impl BonoNft {
    /// Inicializa el contrato.
    ///
    /// * `owner` - cuenta del sistema (admin / minter). Es la única que puede
    ///   mintear bonos y subir un WASM nuevo (upgrade).
    pub fn __constructor(e: &Env, owner: Address) {
        set_owner(e, &owner);
        Base::set_metadata(
            e,
            String::from_str(e, "https://bontrack.cr/bono/"),
            String::from_str(e, "BonTrack - Bono de Deuda Politica"),
            String::from_str(e, "BONO"),
        );
    }

    /// Mintea un bono nuevo con su metadata on-chain y se lo asigna a `to`
    /// (al mintear, `to` es la wallet del partido emisor → estado EMITIDO).
    /// Solo el sistema (`owner`) puede hacerlo. Devuelve el `token_id` asignado.
    ///
    /// Emite el evento de origen `("emitido", token_id)` que la trazabilidad
    /// muestra como `[EMISIÓN]`.
    #[only_owner]
    pub fn mint_bono(
        e: &Env,
        to: Address,
        partido: String,
        serie: String,
        numero: u32,
        valor_nominal: i128,
        fecha_emision: String,
    ) -> u32 {
        let token_id = Base::sequential_mint(e, &to);
        let bono = Bono {
            partido: partido.clone(),
            serie: serie.clone(),
            numero,
            valor_nominal,
            fecha_emision,
        };
        e.storage().persistent().set(&DataKey::Bono(token_id), &bono);
        Emitido {
            token_id,
            to,
            partido,
            serie,
            numero,
            valor_nominal,
        }
        .publish(e);
        token_id
    }

    /// Lee la metadata inmutable on-chain de un bono.
    pub fn get_bono(e: &Env, token_id: u32) -> Bono {
        e.storage()
            .persistent()
            .get(&DataKey::Bono(token_id))
            .unwrap_or_else(|| panic_with_error!(e, BonoError::BonoInexistente))
    }

    /// Endoso de un bono a otro tenedor, con **precio obligatorio (R19)**.
    ///
    /// Extiende el `transfer` de OpenZeppelin (que ya exige la autorización de
    /// `from`) y emite un evento de endoso inmutable con **partes + precio +
    /// timestamp**. Lo firma el vendedor (`from`); en el modelo custodial, el
    /// backend firma en su nombre. El estado del bono permanece COLOCADO; lo que
    /// cambia es el tenedor actual (`owner_of`).
    pub fn transfer_con_precio(e: &Env, from: Address, to: Address, token_id: u32, precio: i128) {
        if precio <= 0 {
            panic_with_error!(e, BonoError::PrecioInvalido);
        }
        // Falla con BonoInexistente si el token no existe.
        let _ = Self::get_bono(e, token_id);
        Base::transfer(e, &from, &to, token_id);
        Endoso {
            token_id,
            from,
            to,
            precio,
            timestamp: e.ledger().timestamp(),
        }
        .publish(e);
    }
}

#[contractimpl]
impl Upgradeable for BonoNft {
    /// Sube un WASM nuevo manteniendo la misma dirección, storage e historial.
    /// Solo el `owner` (sistema). El historial de endosos es inmutable: los
    /// campos que se agreguen en upgrades futuros solo aplican a endosos nuevos.
    #[only_owner]
    fn upgrade(e: &Env, new_wasm_hash: BytesN<32>, _operator: Address) {
        upgradeable::upgrade(e, &new_wasm_hash);
    }
}

// Expone owner_of, balance, transfer, transfer_from, approve, token_uri, name, symbol.
// `transfer` y `transfer_from` revierten vía BonoTransferRules para forzar R19.
#[contractimpl(contracttrait)]
impl NonFungibleToken for BonoNft {
    type ContractType = BonoTransferRules;
}

// Expone get_owner / transfer_ownership / renounce_ownership.
#[contractimpl(contracttrait)]
impl Ownable for BonoNft {}

mod test;
