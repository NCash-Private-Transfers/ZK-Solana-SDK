use anchor_lang::prelude::*;

use crate::{constants::MAX_EPOCHS, errors::ncashError};

/// Configuration for epochs, tracking timing and registered epochs
#[account]
pub struct EpochConfig {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Key used for deterministic PDA creation
    pub create_key: Pubkey,

    /// Authority that can modify this config
    pub deployer: Pubkey,

    /// Duration of each epoch in seconds
    pub epoch_duration_seconds: u64,

    /// Current epoch index (monotonically increasing)
    pub epoch_index: u32,

    /// List of registered epoch accounts
    pub epochs: Vec<Pubkey>,
}

impl EpochConfig {
    /// Constant size for EpochConfig with maximum epochs
    pub const LEN: usize = 8 + // Anchor discriminator
        1 + // bump
        32 + // create_key
        32 + // deployer
        8 + // epoch_duration_seconds
        4 + // epoch_index
        4 + // Vec length discriminator
        (MAX_EPOCHS as usize * 32); // Maximum epochs capacity

    /// Calculates required account size based on current epochs
    /// Useful for dynamic allocation
    pub fn size(epochs: &[Pubkey]) -> usize {
        8 + // Anchor discriminator
        1 + // bump
        32 + // create_key
        32 + // deployer
        8 + // epoch_duration_seconds
        4 + // epoch_index
        4 + // Vec length discriminator
        (epochs.len() * 32) // actual epochs
    }

    /// Validates epoch config state
    pub fn validate(&self) -> Result<()> {
        self.validate_epochs_length()?;
        // Could add more validations here:
        // self.validate_epoch_duration()?;
        // self.validate_epoch_ordering()?;
        Ok(())
    }

    /// Validates epochs list doesn't exceed maximum capacity
    pub fn validate_epochs_length(&self) -> Result<()> {
        require!(
            self.epochs.len() <= MAX_EPOCHS as usize,
            ncashError::MaxEpochLengthReached
        );
        Ok(())
    }

    /// Adds an epoch to the list with validation
    pub fn add_epoch(&mut self, epoch: Pubkey) -> Result<()> {
        require!(
            self.epochs.len() < MAX_EPOCHS as usize,
            ncashError::MaxEpochLengthReached
        );

        // Optional: Check for duplicates
        if !self.epochs.contains(&epoch) {
            self.epochs.push(epoch);
        }

        Ok(())
    }

    /// Removes an epoch from the list
    pub fn remove_epoch(&mut self, epoch: &Pubkey) -> Result<()> {
        if let Some(pos) = self.epochs.iter().position(|e| e == epoch) {
            self.epochs.remove(pos);
        }
        Ok(())
    }

    /// Increments epoch index
    pub fn increment_epoch(&mut self) -> Result<()> {
        self.epoch_index = self
            .epoch_index
            .checked_add(1)
            .ok_or(ncashError::EpochIndexOverflow)?;
        Ok(())
    }

    /// Checks if a specific epoch is registered
    pub fn contains_epoch(&self, epoch: &Pubkey) -> bool {
        self.epochs.contains(epoch)
    }
}
