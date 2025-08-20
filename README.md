# 🚀 StarkNet Validator Staking Guide with `sncast`

This guide will walk you through the **complete process of becoming a StarkNet validator**, from account creation to running your attestation client on DAppNode.  
We’ll use [`sncast`](https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html) for all on-chain interactions.

---

## 🛠 Prerequisites

✅ [`sncast`](https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html) installed  
✅ Access to a synced StarkNet full node (e.g., [Juno](https://github.com/NethermindEth/juno))  
✅ Minimum STRK balance:
- **Sepolia:** 1 STRK  
- **Mainnet:** 20,000 STRK  

---

## 1️⃣ Create Accounts

We’ll create **three accounts**:  
- **staker** → Holds your stake  
- **operator** → Runs the validator  
- **rewards** → Receives rewards

```bash
sncast account create --name staker --network <sepolia|mainnet>
sncast account create --name operator --network <sepolia|mainnet>
sncast account create --name rewards --network <sepolia|mainnet>
```

These accounts are saved in `~/.starknet_accounts`.

---

## 2️⃣ Fund the Accounts

- Fund your **staker account** with the required STRK amount.  
- Send a small amount of STRK to **operator** and **rewards** accounts (to cover activation and gas).  
- On Sepolia, use the [StarkNet Faucet](https://starknet-faucet.vercel.app).

---

## 3️⃣ Deploy the Accounts

```bash
sncast account deploy --name staker --network <sepolia|mainnet>
sncast account deploy --name operator --network <sepolia|mainnet>
sncast account deploy --name rewards --network <sepolia|mainnet>
```

---
## 4️⃣ Approve the Staking Contract

Before staking, the staking contract must be approved to pull STRK from your **staker** account.

```bash
sncast --account staker invoke \
  --contract-address <STRK_CONTRACT_ADDRESS> \
  --function approve \
  --calldata <STAKING_CONTRACT_ADDRESS> <AMOUNT_IN_FRI>\
  --url <JUNO_URL> \
```

> **Tip:** 1 STRK = `1000000000000000000` FRI

📌 **Juno URL:**
- http://juno-sepolia.public.dappnode:6070/v0_8 for _sepolia_
- http://juno.public.dappnode:6060/v0_8 for _mainnet_

📌 **Staking contract addresses:** https://docs.starknet.io/resources/chain-info/#staking

---

## 5️⃣ Stake STRK

Run the `stake` function from your **staker** account:


```bash
sncast --account staker invoke \
  --url <JUNO_URL> \
  --contract-address <STAKING_CONTRACT_ADDRESS> \
  --function stake \
  --calldata \
  <REWARDS_ADDRESS> \
  <OPERATIONAL_ADDRESS> \
  <AMOUNT_IN_FRI> 0x0 0
```
📌 **Juno URL:**
- http://juno-sepolia.public.dappnode:6070/v0_8 for _sepolia_
- http://juno.public.dappnode:6060/v0_8 for _mainnet_

📌 **Staking contract addresses:** https://docs.starknet.io/resources/chain-info/#staking

---


## 6️⃣ Verify Stake

```bash
sncast call \
  --contract-address <STAKING_CONTRACT_ADDRESS> \
  --function get_staker_info_v1 \
  --arguments <STAKER_ADDRESS> \
  --url <JUNO_URL>
```

Example response:
```
response: [
    0x0,
    0xdeadbeef1,
    0xdeadbeef2,
    0x1,
    0xde0b6b3a7640000,
    0x0,
    0x0,
    0x5aa0ca4c068a87f894e8d3918e16ea616df631c28f9c39eae040abfb4966881,
    0x0,
    0x64
]
```

---

## 7️⃣ Set Up the Attestation Client on DAppNode

Once staked, set up your validator’s attestation client.

In your `starknetstaking` DAppNode package, configure:

- `SIGNER_OPERATIONAL_ADDRESS` → Your operator account  
- `SIGNER_PRIVATE_KEY` or `SIGNER_EXTERNAL_URL`  
- `PROVIDER_HTTP_URL` / `PROVIDER_WS_URL` → Juno’s HTTP & WS URLs  

The attestation process will start automatically.

---

## 🧠 Notes & Tips

- You can **claim rewards** or **increase stake** later.
- Make sure your validator client runs **24/7** to avoid penalties.
- Keep your **private keys secure**.
- On Sepolia, test your setup before moving to mainnet.

---

**References:**
- [StarkNet Foundry Docs](https://foundry-rs.github.io/starknet-foundry/)
- [StarkNet Staking Docs](https://docs.starknet.io/architecture/staking/)
- [Juno Full Node](https://github.com/NethermindEth/juno)
