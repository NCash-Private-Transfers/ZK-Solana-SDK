use anchor_lang::prelude::*;

use crate::{constants::*, errors::ncashError};

/// Group account representing a collection of members under a provider
#[account]
pub struct Group {
    /// Unique identifier for the group
    pub id: u32,

    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Creator of the group
    pub creator: Pubkey,

    /// Provider name or identifier (e.g., "google", "github")
    pub provider: String,

    /// Members belonging to this group
    pub members: Vec<Pubkey>,
}

impl Group {
    /// Maximum size of Group account with max members
    pub const LEN: usize = 8 + // Anchor discriminator
        4 + // id
        1 + // bump
        32 + // creator
        4 + MAX_GROUP_PROVIDER_SIZE + // provider (String length + max content)
        4 + // Vec length discriminator
        (MAX_MEMBERS as usize * 32); // Maximum members capacity

    /// Calculates dynamic size based on current members
    pub fn size(members: &[Pubkey]) -> usize {
        8 + 4 + 1 + 32 + 4 + MAX_GROUP_PROVIDER_SIZE + 4 + // Fixed size fields
        (members.len() * 32) // Variable members
    }

    /// Validates group state
    pub fn validate(&self) -> Result<()> {
        self.validate_provider()?;
        self.validate_members()?;
        Ok(())
    }

    /// Validates provider field
    fn validate_provider(&self) -> Result<()> {
        require!(
            self.provider.len() <= MAX_GROUP_PROVIDER_SIZE,
            ncashError::ProviderTooLong
        );

        // Optional: Validate provider format (no empty string, valid characters, etc.)
        require!(!self.provider.is_empty(), ncashError::InvalidProvider);

        Ok(())
    }

    /// Validates members array
    fn validate_members(&self) -> Result<()> {
        require!(
            self.members.len() <= MAX_MEMBERS as usize,
            ncashError::MaxMembersReached
        );

        // Optional: Check for duplicate members
        self.check_duplicate_members()?;

        Ok(())
    }

    /// Checks for duplicate member addresses
    fn check_duplicate_members(&self) -> Result<()> {
        let mut seen = std::collections::HashSet::new();
        for member in &self.members {
            if !seen.insert(member) {
                return err!(ncashError::DuplicateMember);
            }
        }
        Ok(())
    }

    /// Adds a member to the group with validation
    pub fn add_member(&mut self, member: Pubkey) -> Result<()> {
        require!(
            self.members.len() < MAX_MEMBERS as usize,
            ncashError::MaxMembersReached
        );

        // Check for duplicates
        if self.members.contains(&member) {
            return err!(ncashError::DuplicateMember);
        }

        self.members.push(member);
        Ok(())
    }

    /// Removes a member from the group
    pub fn remove_member(&mut self, member: &Pubkey) -> Result<()> {
        if let Some(pos) = self.members.iter().position(|m| m == member) {
            self.members.remove(pos);
        }
        Ok(())
    }

    /// Checks if a specific member is in the group
    pub fn has_member(&self, member: &Pubkey) -> bool {
        self.members.contains(member)
    }

    /// Returns the number of members
    pub fn member_count(&self) -> usize {
        self.members.len()
    }

    /// Clears all members from the group
    pub fn clear_members(&mut self) {
        self.members.clear();
    }
}
