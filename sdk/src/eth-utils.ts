import { BeaconState, ClaimInfo, WitnessData, ClaimID } from "./types";
import { keccak256, ethers, HDNodeWallet, BytesLike } from "ethers";

// ===========================================
// Constants & Types
// ===========================================

/** Configuration for witness selection */
interface WitnessSelectionConfig {
  witnesses: Array<{ wallet: HDNodeWallet; id: string; url: string }>;
  message: string;
  epochIndex: number;
  timestamp: number;
  minimumWitnessesForClaim: number;
  identifier: string;
}

// ===========================================
// Claim Hashing
// ===========================================

/**
 * Hashes claim information to generate a unique ClaimID
 * @param info Claim information to hash
 * @returns Keccak256 hash of the claim info
 */
export function hashClaimInfo(info: ClaimInfo): ClaimID {
  const serializedContext = JSON.stringify({
    contextAddress: info.contextAddress.toString(),
    contextMessage: info.contextMessage,
  });

  const concatenatedString = [
    info.provider,
    info.parameters,
    serializedContext,
  ].join("\n");

  const hash = keccak256(Buffer.from(concatenatedString, "utf-8"));
  return hash.toLowerCase();
}

// ===========================================
// Witness Selection
// ===========================================

/**
 * Computes deterministic witness selection for a claim using pseudo-random sampling
 * @param state Current beacon state
 * @param params Claim parameters or pre-hashed identifier
 * @param timestampS Timestamp of the claim in seconds
 * @returns List of selected witnesses
 */
export function fetchWitnessListForClaim(
  state: BeaconState,
  params: string | ClaimInfo,
  timestampS: number
): WitnessData[] {
  const { witnesses, witnessesRequiredForClaim, epoch } = state;

  // Generate claim identifier
  const identifier = typeof params === "string" 
    ? params 
    : hashClaimInfo(params);

  // Create deterministic seed for witness selection
  const selectionSeed = generateSelectionSeed(
    identifier,
    epoch,
    witnessesRequiredForClaim,
    timestampS
  );

  return selectWitnesses(witnesses, witnessesRequiredForClaim, selectionSeed);
}

/**
 * Generates a deterministic seed for witness selection
 */
function generateSelectionSeed(
  identifier: string,
  epoch: number,
  requiredWitnesses: number,
  timestamp: number
): Buffer {
  const input = [
    identifier,
    epoch.toString(),
    requiredWitnesses.toString(),
    timestamp.toString(),
  ].join("\n");

  const hash = keccak256(Buffer.from(input, "utf-8"));
  return Buffer.from(hash.slice(2), "hex"); // Remove '0x' prefix
}

/**
 * Selects witnesses using Fisher-Yates sampling with deterministic seed
 */
function selectWitnesses(
  witnesses: WitnessData[],
  requiredCount: number,
  seed: Buffer
): WitnessData[] {
  if (requiredCount > witnesses.length) {
    throw new Error(`Insufficient witnesses: need ${requiredCount}, have ${witnesses.length}`);
  }

  const availableWitnesses = [...witnesses];
  const selectedWitnesses: WitnessData[] = [];
  let byteOffset = 0;

  for (let i = 0; i < requiredCount; i++) {
    // Read 4 bytes from seed for randomness
    const randomValue = seed.readUint32BE(byteOffset);
    const witnessIndex = randomValue % availableWitnesses.length;
    
    selectedWitnesses.push(availableWitnesses[witnessIndex]);
    
    // Remove selected witness using swap-pop for O(1) removal
    availableWitnesses[witnessIndex] = availableWitnesses[availableWitnesses.length - 1];
    availableWitnesses.pop();
    
    // Cycle through seed bytes
    byteOffset = (byteOffset + 4) % seed.length;
  }

  return selectedWitnesses;
}

// ===========================================
// Witness Signing
// ===========================================

/**
 * Selects witnesses and collects signatures for a message
 * @param config Configuration for witness selection and signing
 * @returns Array of signatures from selected witnesses
 */
export async function witnessSelectSignMessage(
  config: WitnessSelectionConfig
): Promise<string[]> {
  const { 
    witnesses, 
    message, 
    epochIndex, 
    timestamp, 
    minimumWitnessesForClaim, 
    identifier 
  } = config;

  // Extract witness metadata
  const witnessMetadata = witnesses.map(({ id, url }) => ({ id, url }));

  // Select witnesses for this claim
  const selectedWitnessIds = fetchWitnessListForClaim(
    {
      witnesses: witnessMetadata,
      epoch: epochIndex,
      witnessesRequiredForClaim: minimumWitnessesForClaim,
      nextEpochTimestampS: 0,
    },
    identifier,
    timestamp
  ).map(w => w.id);

  // Filter to only selected witnesses
  const selectedWitnesses = witnesses.filter(w => 
    selectedWitnessIds.includes(w.id)
  );

  // Collect signatures in parallel
  const signatures = await Promise.all(
    selectedWitnesses.map(w => w.wallet.signMessage(message))
  );

  return signatures;
}

// ===========================================
// Utility Functions
// ===========================================

/**
 * Converts a hex hash string to byte array
 * @param hash Hex string (with or without '0x' prefix)
 * @returns Uint8Array of bytes
 */
export function serializeHash(hash: string): Uint8Array {
  return new Uint8Array(ethers.getBytes(hash));
}

/**
 * Alternative: Converts hash to Buffer for Node.js environments
 */
export function hashToBuffer(hash: string): Buffer {
  return Buffer.from(ethers.getBytes(hash));
}