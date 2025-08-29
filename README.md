# 🚀 StarkNet Validator Solo Staking Guide

This guide will walk you through the **complete process of becoming a StarkNet validator and Solo Staker**, from wallet setup to running your attestation client on DAppNode.  
We’ll use **[Argent Wallet](https://www.argent.xyz/)** and Starknet's block explorer interface for all on-chain interactions.

---

## 🛠 Prerequisites

✅ [Argent Wallet](https://www.argent.xyz/) installed and funded  
✅ Access to a synced StarkNet full node (e.g., [Juno](https://github.com/NethermindEth/juno))  
✅ Minimum STRK balance:
- **Sepolia:** 1 STRK  
- **Mainnet:** 20,000 STRK  

---

## 1️⃣ Create Accounts

We’ll use **three StarkNet accounts** in Argent:

- **staker** → Holds your stake  
- **operator** → Runs the validator  
- **rewards** → Receives rewards  

👉 Create them directly in Argent Wallet as _Standard Account_

![Argent wallet create account](https://github.com/dappnode/DAppNodePackage-starknetstaking-generic/raw/main/images/argent-create-account.png)

---

## 2️⃣ Fund the Accounts

- Fund your **staker account** with the required STRK amount.  
- On Sepolia, use the [StarkNet Faucet](https://starknet-faucet.vercel.app).  

---

## 3️⃣ Stake STRK

To interact with the contracts we will use the block expolorer [Voyager](https://voyager.online/) or [StarkScan](https://starkscan.co/)

1. Open the [Staking Contract on Voyager (Sepolia)](https://sepolia.voyager.online/contract/0x03745ab04a431fc02871a139be6b93d9260b0ff3e779ad9c8b377183b23109f1#writeContract).  
2. Connect your **staker** Argent Wallet.  
3. Scroll down to the `stake` function.  
4. Fill in the calldata:
   - **rewards_address** → Your rewards account  
   - **operational_address** → Your operator account  
   - **amount** → Amount in FRI (1 STRK = `1000000000000000000`)  
5. Submit the transaction.  


📌 **Staking contract addresses:** [StarkNet Docs – Staking](https://docs.starknet.io/resources/chain-info/#staking)

![Voyager write contract stake](https://github.com/dappnode/DAppNodePackage-starknetstaking-generic/raw/main/images/voyager-stake.png)

---

## 4️⃣  Set Up the Attestation Client on DAppNode

Once staked, set up your validator’s attestation client.

In your `starknetstaking` DAppNode package, configure:

- `OPERATIONAL ADDRESS` → Your operator account  
- `PRIVATE KEY` → The private key from your operator account (Export it using Argent Wallet)

The attestation process will start automatically.

---

## 🧠 Notes & Tips

- You can **claim rewards** or **increase stake** later from the same Voyager contract UI.  
- Make sure your validator client runs **24/7** to avoid penalties.  
- Test your setup on Sepolia before moving to mainnet.  

---

**References:**
- [Argent Wallet](https://www.argent.xyz/)
- [Voyager StarkNet Explorer](https://voyager.online/)
- [Starkscan Starknet Explorer](https://starkscan.co/)
- [StarkNet Staking Docs](https://docs.starknet.io/architecture/staking/)
- [Juno Full Node](https://github.com/NethermindEth/juno)
