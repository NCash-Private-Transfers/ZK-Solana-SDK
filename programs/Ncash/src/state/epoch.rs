impl Epoch {
    pub const LEN: usize = 8
        + 1
        + 32
        + 4
        + 8
        + 8
        + 1
        + 4
        + (MAX_WITNESSES as usize * ((4 + MAX_WITNESS_ADDRESS_SIZE) + (4 + MAX_WITNESS_URL_SIZE)));

    pub fn size(witnesses: &[Witness]) -> usize {
        let witness_size = (4 + MAX_WITNESS_ADDRESS_SIZE) + (4 + MAX_WITNESS_URL_SIZE);
        8 + 1 + 32 + 4 + 8 + 8 + 1 + 4 + (witnesses.len() * witness_size)
    }

    pub fn validate(&self) -> Result<()> {
        require!(
            self.witnesses.len() <= MAX_WITNESSES as usize,
            ncashError::MaxWitnessesReached
        );

        for witness in &self.witnesses {
            require!(
                is_valid_ethereum_address(&witness.address),
                ncashError::InvalidWitness
            );
            require!(
                witness.url.len() <= MAX_WITNESS_URL_SIZE,
                ncashError::HostTooLong
            );
        }

        require!(
            (self.minimum_witnesses_for_claim as usize) <= self.witnesses.len(),
            ncashError::InvalidWitnessClaimCount
        );

        Ok(())
    }
}
