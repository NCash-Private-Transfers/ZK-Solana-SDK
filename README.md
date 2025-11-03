# NCash Zero knowledge Solana SDK
This is the Solana SDK that will be integrated with The swap transactions to leave no trail and add extra layer of security to transactions

## Environment

### Prerequisites

1. Rust - Install via [here](https://www.rust-lang.org/tools/install)
2. Solana Tool Suite - Install via [here](https://docs.solanalabs.com/cli/install)
3. Node JS - Install via [here](https://nodejs.org/en/download)
4. yarn package manager - `npm install -g yarn`
5. Anchor - Install via [here](https://www.anchor-lang.com/docs/installation)

## Installation

To get started, clone the repository and install the dependencies:

```bash
git clone https://github.com/NCash-Private-Transfers/ZK-Solana-SDK
cd ncash-solana-sdk
yarn install
```

### Setup

The setup process involves generating a new program keypair and updating the configuration files to use the newly generated program ID.

To start the setup:

```bash
yarn setup
```

The setup script will:

- Generate a new program keypair.
- Update the Anchor.toml, .solitarc.js, and lib.rs files with the new program ID.
- Modify the program's utilities and configurations.

### Build

To build the SDK, use the following command:

```bash
yarn build
```

This will compile the SDK and generate the required build artifacts.

### Deploying the Contract

Deploying the contract requires building the Anchor project and deploying it to the specified Solana network.

1. Build the Anchor project:

```bash
anchor build
```

2. Deploy the contract using the generated program keypair:

```bash
anchor deploy --program-name ncash --program-keypair program-keypairs/ncash-program-keypair.json
```

3. Take note of the Program ID shown in the output.

### Configuring the Program

After deploying the program, backfill the epochs to initialize the epochConfig account.

1. Run the backfill command:

```bash
yarn backfill
```

2. Take note of the Epoch config address displayed in the output

### Adding an Epoch

To add an epoch, use the `add-epoch` command, passing the `epochConfig` address as an argument.

```bash
yarn add-epoch <Epoch config address>
```

Replace `<Epoch config address>` with the actual address from the backfill step.

### Specifying the Network

By default the SDK will be interacting with Solana `devnet` Network if you want to change the Network you can set the network (cluster) for various commands by using the SOLANA_CLUSTER environment variable. The options are:

- **devnet** (default)
- **testnet**
- **mainnet**

**Example: Specifying the Network for Scripts**

To backfill epochs on testnet, run:

```bash
SOLANA_CLUSTER=testnet yarn backfill
```

To add an epoch on testnet, run:

```bash
SOLANA_CLUSTER=testnet yarn add-epoch <Epoch config address>
```

**Example: Deploying the Contract on Different Networks**

To deploy the contract on testnet:

1. First replace the lines in `Anchor.toml`:

   ```bash
   [programs.devnet]
   cluster = "devnet"
   ```

   with:

   ```bash
   [programs.testnet]
   cluster = "testnet"
   ```

2. Run the `anchor deploy` command with the `--provider.cluster` option.

   ```bash
   anchor deploy --provider.cluster testnet --program-name ncash --program-keypair program-keypairs/ncash-program-keypair.json
   ```

By following these steps, you can easily configure the SDK and deploy the ncash program on any Solana network.

### Repository directory

- programs/ncash - The anchor smart contract code for ncash program
- sdk - The auto generated SDK folder using solita
- scripts - Automated scripts to speed up certain initializing processes
- program-keypairs - The keypairs that are stored for vanity addresses
- tests - The test suites that are ran during `anchor test`

