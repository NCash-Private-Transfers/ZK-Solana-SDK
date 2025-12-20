import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  TransactionMessage,
  TransactionInstruction,
  VersionedTransaction,
  Signer,
  ComputeBudgetProgram,
} from "@solana/web3.js";

import testProgramKeypair from "../program-keypairs/ncash-program-keypair.json";
import { EpochConfig } from "@ncashprotocol/solana-sdk/src/accounts";
import { toBigInt } from "@ncashprotocol/solana-sdk/src/utils";

export function createLocalhostConnection() {
  return new Connection("http://127.0.0.1:8899", "confirmed");
}

export function getTestProgramId() {
  const programKeypair = Keypair.fromSecretKey(Buffer.from(testProgramKeypair));
  return programKeypair.publicKey;
}

export function createComputeLimitAndFeeIx(units: number, feeLamports: number) {
  const modifyComputeUnitsIx = ComputeBudgetProgram.setComputeUnitLimit({
    units,
  });

  const addPriorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: feeLamports,
  });

  return [modifyComputeUnitsIx, addPriorityFeeIx];
}


export async function getEpochConfigEpochIndex(
  connection: Connection,
  epochConfig: PublicKey
) {
  let epochConfigAccount = await EpochConfig.fromAccountAddress(connection, epochConfig);
  const epochIndex = toBigInt(epochConfigAccount.epochIndex) + 1n;
  return epochIndex;
}

export async function sendTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signers: Signer[],
  options: {
    skipPreflight?: boolean;
    commitment?: Commitment;
    maxRetries?: number;
  } = {}
): Promise<string> {
  const {
    skipPreflight = false,
    commitment = 'confirmed',
    maxRetries = 0,
  } = options;

  // Get latest blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  
  // Create and sign transaction
  const tx = createAndSignTransaction(instructions, payer, blockhash, signers);
  
  // Send transaction with retry logic
  const signature = await sendWithRetry(
    connection,
    tx,
    { skipPreflight, maxRetries }
  );
  
  // Wait for confirmation
  await confirmTransaction(
    connection,
    signature,
    { blockhash, lastValidBlockHeight, commitment }
  );
  
  return signature;
}

/**
 * Creates and signs a versioned transaction
 */
function createAndSignTransaction(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  blockhash: string,
  signers: Signer[]
): VersionedTransaction {
  const message = new TransactionMessage({
    instructions,
    payerKey: payer,
    recentBlockhash: blockhash,
  }).compileToV0Message();
  
  const tx = new VersionedTransaction(message);
  tx.sign(signers);
  return tx;
}

/**
 * Sends transaction with optional retry logic
 */
async function sendWithRetry(
  connection: Connection,
  tx: VersionedTransaction,
  options: { skipPreflight: boolean; maxRetries: number }
): Promise<string> {
  const { skipPreflight, maxRetries } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight,
        maxRetries: 0, // Handle retries manually
      });
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // Optional: Add delay between retries
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
  
  throw new Error('Failed to send transaction after retries');
}

/**
 * Confirms transaction with commitment level
 */
async function confirmTransaction(
  connection: Connection,
  signature: string,
  params: {
    blockhash: string;
    lastValidBlockHeight: number;
    commitment?: Commitment;
  }
): Promise<void> {
  await connection.confirmTransaction({
    blockhash: params.blockhash,
    lastValidBlockHeight: params.lastValidBlockHeight,
    signature,
  }, params.commitment);
}