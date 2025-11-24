use anchor_lang::prelude::*;

use crate::{constants::*, errors::ncashError, state::*};

#[derive(Accounts)]
pub struct ChangeEpochIndex<'info> {
    /// Epoch configuration account to update
    #[account(
        mut,
        seeds = [
            SEED_PREFIX,
            SEED_EPOCH_CONFIG,
            epoch_config.create_key.as_ref()
        ],
        bump = epoch_config.bump,
        has_one = deployer @ ncashError::Unauthorized,
    )]
    pub epoch_config: Account<'info, EpochConfig>,

    /// Deployer authorized to update epoch configuration
    /// Must match epoch_config.deployer
    #[account(mut)]
    pub deployer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ChangeEpochIndexArgs {
    /// New epoch index to set
    /// Must be greater than current epoch index
    pub new_epoch_index: u32,
}

impl<'info> ChangeEpochIndex<'info> {
    pub fn execute(ctx: Context<Self>, args: ChangeEpochIndexArgs) -> Result<()> {
        let epoch_config = &mut ctx.accounts.epoch_config;

        // Validate new epoch index is increasing
        Self::validate_epoch_index(args.new_epoch_index, epoch_config.epoch_index)?;

        // Update epoch index
        epoch_config.epoch_index = args.new_epoch_index;

        // Optionally emit an event for tracking
        // emit!(EpochIndexChanged {
        //     old_index: old_index,
        //     new_index: args.new_epoch_index
        // });

        Ok(())
    }

    /// Validates that new epoch index is valid
    fn validate_epoch_index(new_index: u32, current_index: u32) -> Result<()> {
        require!(new_index > current_index, ncashError::InvalidEpochIndex);

        // Optional: Add upper bound validation
        // require!(
        //     new_index <= current_index.saturating_add(MAX_EPOCH_INCREMENT),
        //     ncashError::EpochIndexExceedsLimit
        // );

        Ok(())
    }
}
