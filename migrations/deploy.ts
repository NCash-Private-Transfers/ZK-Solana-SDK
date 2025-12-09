const anchor = require("@coral-xyz/anchor");
const { PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

module.exports = async function (provider) {
  // Configure client to use the provider
  anchor.setProvider(provider);
  
  console.log("🚀 Starting deployment migration...");
  console.log(`Network: ${provider.connection.rpcEndpoint}`);
  console.log(`Wallet: ${provider.wallet.publicKey.toString()}`);

  // Load the IDL and program
  const programId = new PublicKey("2NRByeqyVqXf4LByQP8aTAnWToK9zCwV8JSBZTW2gQAq");
  const idl = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, "./target/idl/ncash.json"),
      "utf8"
    )
  );
  
  const program = new anchor.Program(idl, programId, provider);

  try {
    // ===========================================
    // 1. Initialize Core Program Accounts
    // ===========================================
    
    console.log("\n📦 Initializing core program accounts...");
    
    // Example: Initialize a default epoch config
    const createKey = anchor.web3.Keypair.generate();
    const [epochConfigPDA] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("ncash"),
        Buffer.from("epoch_config"),
        createKey.publicKey.toBuffer(),
      ],
      programId
    );
    
    console.log(`Epoch Config PDA: ${epochConfigPDA.toString()}`);
    console.log(`Create Key: ${createKey.publicKey.toString()}`);

    // Initialize epoch config
    try {
      const tx = await program.methods
        .initializeEpochConfig({
          epochDurationSeconds: new anchor.BN(86400), // 1 day
        })
        .accounts({
          epochConfig: epochConfigPDA,
          createKey: createKey.publicKey,
          deployer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([createKey])
        .rpc();
      
      console.log(`✅ Epoch config initialized: ${tx}`);
    } catch (error) {
      if (error.message.includes("already in use")) {
        console.log("⚠️  Epoch config already initialized");
      } else {
        throw error;
      }
    }

    // ===========================================
    // 2. Initialize Default Groups
    // ===========================================
    
    console.log("\n👥 Initializing default groups...");
    
    const defaultGroups = [
      { provider: "github", id: 1 },
      { provider: "google", id: 2 },
      { provider: "discord", id: 3 },
    ];
    
    for (const group of defaultGroups) {
      const [groupPDA] = await PublicKey.findProgramAddressSync(
        [
          Buffer.from("ncash"),
          Buffer.from("group"),
          Buffer.from(group.provider),
        ],
        programId
      );
      
      try {
        const tx = await program.methods
          .createGroup(group.provider)
          .accounts({
            group: groupPDA,
            creator: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        
        console.log(`✅ ${group.provider} group created: ${tx}`);
      } catch (error) {
        if (error.message.includes("already in use")) {
          console.log(`⚠️  ${group.provider} group already exists`);
        } else {
          console.error(`❌ Failed to create ${group.provider} group:`, error.message);
        }
      }
    }

    // ===========================================
    // 3. Create Initial Epochs
    // ===========================================
    
    console.log("\n🔄 Creating initial epochs...");
    
    const [epochPDA] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from("ncash"),
        Buffer.from("epoch"),
        epochConfigPDA.toBuffer(),
        Buffer.from([0, 0, 0, 0]), // epoch index 0
      ],
      programId
    );
    
    try {
      // Add epoch to config
      const addEpochTx = await program.methods
        .addEpoch({
          index: 0,
          createdAt: new anchor.BN(Math.floor(Date.now() / 1000)),
          expiredAt: new anchor.BN(Math.floor(Date.now() / 1000) + 86400),
          minimumWitnessesForClaim: 2,
          witnesses: [
            {
              address: "0x0000000000000000000000000000000000000000",
              url: "https://witness-1.example.com",
            },
            {
              address: "0x1111111111111111111111111111111111111111",
              url: "https://witness-2.example.com",
            },
          ],
        })
        .accounts({
          epoch: epochPDA,
          epochConfig: epochConfigPDA,
          deployer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log(`✅ Initial epoch added: ${addEpochTx}`);
    } catch (error) {
      console.error("❌ Failed to create initial epoch:", error.message);
    }

    // ===========================================
    // 4. Verify Program State
    // ===========================================
    
    console.log("\n🔍 Verifying program state...");
    
    // Check epoch config
    try {
      const epochConfigAccount = await program.account.epochConfig.fetch(epochConfigPDA);
      console.log(`✅ Epoch Config loaded:`);
      console.log(`   - Deployer: ${epochConfigAccount.deployer.toString()}`);
      console.log(`   - Duration: ${epochConfigAccount.epochDurationSeconds.toString()}s`);
      console.log(`   - Current Index: ${epochConfigAccount.epochIndex}`);
      console.log(`   - Epochs Count: ${epochConfigAccount.epochs.length}`);
    } catch (error) {
      console.log("⚠️  Could not fetch epoch config");
    }
    
    // Check groups
    for (const group of defaultGroups) {
      const [groupPDA] = await PublicKey.findProgramAddressSync(
        [
          Buffer.from("ncash"),
          Buffer.from("group"),
          Buffer.from(group.provider),
        ],
        programId
      );
      
      try {
        const groupAccount = await program.account.group.fetch(groupPDA);
        console.log(`✅ ${group.provider} Group:`);
        console.log(`   - ID: ${groupAccount.id}`);
        console.log(`   - Creator: ${groupAccount.creator.toString()}`);
        console.log(`   - Members: ${groupAccount.members.length}`);
      } catch (error) {
        console.log(`⚠️  Could not fetch ${group.provider} group`);
      }
    }

    // ===========================================
    // 5. Save Deployment Information
    // ===========================================
    
    const deploymentInfo = {
      network: provider.connection.rpcEndpoint,
      timestamp: new Date().toISOString(),
      programId: programId.toString(),
      accounts: {
        epochConfig: epochConfigPDA.toString(),
        createKey: createKey.publicKey.toString(),
        groups: defaultGroups.map(g => ({
          provider: g.provider,
          address: (() => {
            const [pda] = PublicKey.findProgramAddressSync(
              [Buffer.from("ncash"), Buffer.from("group"), Buffer.from(g.provider)],
              programId
            );
            return pda.toString();
          })()
        }))
      }
    };
    
    const deployDir = path.resolve(__dirname, "./deployments");
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(deployDir, `deployment-${Date.now()}.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n🎉 Migration completed successfully!");
    console.log("📁 Deployment info saved to deployments/ directory");
    
  } catch (error) {
    console.error("\n❌ Migration failed:");
    console.error(error);
    throw error;
  }
};