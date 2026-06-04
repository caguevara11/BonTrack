#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

fn setup(e: &Env) -> (Address, BonoNftClient<'_>) {
    let owner = Address::generate(e);
    let contract_id = e.register(BonoNft, (owner.clone(),));
    (owner, BonoNftClient::new(e, &contract_id))
}

fn mint_demo_bono(e: &Env, client: &BonoNftClient, to: &Address, numero: u32) -> u32 {
    client.mint_bono(
        to,
        &String::from_str(e, "PLN"),
        &String::from_str(e, "A"),
        &numero,
        &1_000_000_i128,
        &String::from_str(e, "2026-01-14"),
    )
}

#[test]
fn mint_guarda_metadata_y_owner() {
    let e = Env::default();
    e.mock_all_auths();
    let (_owner, client) = setup(&e);
    let partido = Address::generate(&e);

    let token_id = mint_demo_bono(&e, &client, &partido, 4);
    assert_eq!(token_id, 0); // secuencial desde 0

    assert_eq!(client.owner_of(&token_id), partido);
    let bono = client.get_bono(&token_id);
    assert_eq!(bono.partido, String::from_str(&e, "PLN"));
    assert_eq!(bono.serie, String::from_str(&e, "A"));
    assert_eq!(bono.numero, 4);
    assert_eq!(bono.valor_nominal, 1_000_000_i128);
}

#[test]
fn cadena_de_endosos_actualiza_tenedor() {
    let e = Env::default();
    e.mock_all_auths();
    let (_owner, client) = setup(&e);
    let partido = Address::generate(&e);
    let carlos = Address::generate(&e);
    let maria = Address::generate(&e);

    let token_id = mint_demo_bono(&e, &client, &partido, 4);

    // Colocación: PLN -> Carlos
    client.transfer_con_precio(&partido, &carlos, &token_id, &900_000_i128);
    assert_eq!(client.owner_of(&token_id), carlos);

    // Endoso: Carlos -> María
    client.transfer_con_precio(&carlos, &maria, &token_id, &950_000_i128);
    assert_eq!(client.owner_of(&token_id), maria);

    // La metadata inmutable no cambió.
    assert_eq!(client.get_bono(&token_id).numero, 4);
}

#[test]
fn precio_obligatorio_rechaza_cero_o_negativo() {
    let e = Env::default();
    e.mock_all_auths();
    let (_owner, client) = setup(&e);
    let partido = Address::generate(&e);
    let carlos = Address::generate(&e);
    let token_id = mint_demo_bono(&e, &client, &partido, 4);

    let precio_invalido =
        soroban_sdk::Error::from_contract_error(BonoError::PrecioInvalido as u32);

    let res = client.try_transfer_con_precio(&partido, &carlos, &token_id, &0_i128);
    assert_eq!(res, Err(Ok(precio_invalido)));

    let res_neg = client.try_transfer_con_precio(&partido, &carlos, &token_id, &-1_i128);
    assert_eq!(res_neg, Err(Ok(precio_invalido)));

    // El bono no se movió.
    assert_eq!(client.owner_of(&token_id), partido);
}

#[test]
fn transfer_directo_rechazado_para_forzar_precio() {
    let e = Env::default();
    e.mock_all_auths();
    let (_owner, client) = setup(&e);
    let partido = Address::generate(&e);
    let carlos = Address::generate(&e);
    let token_id = mint_demo_bono(&e, &client, &partido, 4);

    let error =
        soroban_sdk::Error::from_contract_error(BonoError::TransferDirectaNoPermitida as u32);

    let res = client.try_transfer(&partido, &carlos, &token_id);
    assert_eq!(res, Err(Ok(error)));
    assert_eq!(client.owner_of(&token_id), partido);
}

#[test]
fn transfer_from_directo_rechazado_para_forzar_precio() {
    let e = Env::default();
    e.mock_all_auths();
    let (_owner, client) = setup(&e);
    let partido = Address::generate(&e);
    let operador = Address::generate(&e);
    let carlos = Address::generate(&e);
    let token_id = mint_demo_bono(&e, &client, &partido, 4);

    let error =
        soroban_sdk::Error::from_contract_error(BonoError::TransferDirectaNoPermitida as u32);

    let res = client.try_transfer_from(&operador, &partido, &carlos, &token_id);
    assert_eq!(res, Err(Ok(error)));
    assert_eq!(client.owner_of(&token_id), partido);
}

#[test]
fn get_bono_inexistente_falla() {
    let e = Env::default();
    e.mock_all_auths();
    let (_owner, client) = setup(&e);
    let res = client.try_get_bono(&999);
    match res {
        Err(Ok(e)) => assert_eq!(
            e,
            soroban_sdk::Error::from_contract_error(BonoError::BonoInexistente as u32)
        ),
        _ => panic!("se esperaba el error BonoInexistente"),
    }
}
