use anchor_lang::prelude::*;

use crate::{constants::*, errors::ncashError, state::*};

#[derive(Accounts)]
#[instruction(args: InitializeEpochConfigArgs)]
pub struct InitializeEpochConfig<'info> {
    /// Epoch configuration account being initialized
    #[account(
        init,
        payer = payer,
        space = EpochConfig::LEN, // Consider using constant size
        seeds = [
            SEED_PREFIX,
            SEED_EPOCH_CONFIG,
            create_key.key().as_ref()
        ],
        bump
    )]
    pub epoch_config: Account<'info, EpochConfig>,

    /// Key used for deterministic PDA derivation
    /// This creates a unique epoch config for each create_key
    pub create_key: Signer<'info>,

    /// Payer for account initialization
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitializeEpochConfigArgs {
    /// Duration of each epoch in seconds
    /// Must be greater than 0
    pub epoch_duration_seconds: u64,
}

impl<'info> InitializeEpochConfig<'info> {
    pub fn execute(ctx: Context<Self>, args: InitializeEpochConfigArgs) -> Result<()> {
        let InitializeEpochConfig {
            epoch_config,
            payer,
            create_key,
            ..
        } = ctx.accounts;

        // Validate epoch duration
        Self::validate_epoch_duration(args.epoch_duration_seconds)?;

        // Initialize epoch config
        epoch_config.init(EpochConfigData {
            bump: ctx.bumps.epoch_config,
            create_key: create_key.key(),
            payer: payer.key(),
            epoch_duration_seconds: args.epoch_duration_seconds,
            epoch_index: 0,
            epochs: Vec::new(),
        })?;

        // Optional: Emit initialization event
        // emit!(EpochConfigInitialized {
        //     create_key: create_key.key(),
        //     epoch_duration: args.epoch_duration_seconds,
        // });

        Ok(())
    }

    /// Validates epoch duration parameter
    fn validate_epoch_duration(duration_seconds: u64) -> Result<()> {
        require!(duration_seconds > 0, ncashError::InvalidEpochDuration);

        // Optional: Add maximum duration validation
        // const MAX_EPOCH_DURATION: u64 = 365 * 24 * 60 * 60; // 1 year
        // require!(
        //     duration_seconds <= MAX_EPOCH_DURATION,
        //     ncashError::EpochDurationTooLong
        // );

        Ok(())
    }
}
