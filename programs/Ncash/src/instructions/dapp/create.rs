use anchor_lang::prelude::*;

use crate::{constants::*, events::CreateDappEvent, state::*, utils::fetch_dapp_id};

#[derive(Accounts)]
#[instruction(args: CreateDappArgs)]
pub struct CreateDapp<'info> {
    /// Dapp account being created
    #[account(
        init,
        payer = payer,
        space = Dapp::LEN,
        seeds = [
            SEED_PREFIX,
            SEED_DAPP,
            create_key.key().as_ref(),
            group.key().as_ref()
        ],
        bump
    )]
    pub dapp: Account<'info, Dapp>,

    /// Group this dapp belongs to
    #[account(
        seeds = [
            SEED_PREFIX,
            SEED_GROUP,
            group.provider.as_bytes(),
        ],
        bump = group.bump
        // TODO: Add validation if creator needs to be authorized by group
    )]
    pub group: Account<'info, Group>,

    /// Key used for deterministic dapp address derivation
    /// Must sign to prove ownership of the create key
    pub create_key: Signer<'info>,

    /// Payer for account creation
    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateDappArgs {
    /// Merkle root for group membership verification
    /// Currently placeholder to match Ethereum structure
    group_root: u64,
}

impl CreateDapp<'_> {
    pub fn execute(ctx: Context<Self>, args: CreateDappArgs) -> Result<()> {
        let Self {
            dapp,
            group,
            create_key,
            payer,
            ..
        } = ctx.accounts;

        // Generate deterministic dapp ID
        let dapp_id = fetch_dapp_id(payer.key(), args.group_root)?;

        // Initialize dapp state
        dapp.init(DappData {
            bump: ctx.bumps.dapp,
            create_key: create_key.key(),
            creator: payer.key(),
            group: group.key(),
            group_root: args.group_root,
            id: dapp_id,
        })?;

        // Emit creation event
        emit!(CreateDappEvent { id: dapp_id });

        Ok(())
    }
}
