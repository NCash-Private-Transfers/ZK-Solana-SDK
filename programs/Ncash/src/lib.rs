#![allow(unknown_lints)]
#![allow(ambiguous_glob_reexports)]

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

declare_id!("2NRByeqyVqXf4LByQP8aTAnWToK9zCwV8JSBZTW2gQAq");

/// nCash program - A decentralized authentication and verification system
#[program]
pub mod ncash {
    use super::*;

    // ===========================================
    // Epoch Management Instructions
    // ===========================================

    /// Initializes a new epoch configuration
    pub fn initialize_epoch_config(
        ctx: Context<InitializeEpochConfig>,
        epoch_duration_seconds: u64,
    ) -> Result<()> {
        instructions::initialize_epoch_config(ctx, epoch_duration_seconds)
    }

    /// Updates the current epoch index
    pub fn change_epoch_index(ctx: Context<ChangeEpochIndex>, new_epoch_index: u32) -> Result<()> {
        instructions::change_epoch_index(ctx, new_epoch_index)
    }

    /// Adds a new epoch to the configuration
    pub fn add_epoch(ctx: Context<AddEpoch>, args: AddEpochArgs) -> Result<()> {
        instructions::add_epoch(ctx, args)
    }

    // ===========================================
    // Group Management Instructions
    // ===========================================

    /// Creates a new group for a provider
    pub fn create_group(ctx: Context<CreateGroup>, provider: String) -> Result<()> {
        instructions::create_group(ctx, provider)
    }

    /// Verifies a membership proof for a group
    pub fn verify_proof(ctx: Context<VerifyProof>, args: VerifyProofArgs) -> Result<()> {
        instructions::verify_proof(ctx, args)
    }

    // ===========================================
    // DApp Management Instructions
    // ===========================================

    /// Creates a new decentralized application
    pub fn create_dapp(ctx: Context<CreateDapp>, group_root: u64) -> Result<()> {
        instructions::create_dapp(ctx, group_root)
    }
}

// ===========================================
// Re-exports for easier external use
// ===========================================
pub use instructions::{
    AddEpoch,
    AddEpochArgs,
    ChangeEpochIndex,
    // DApp
    CreateDapp,
    // Group
    CreateGroup,
    // Epoch
    InitializeEpochConfig,
    VerifyProof,
    VerifyProofArgs,
};
