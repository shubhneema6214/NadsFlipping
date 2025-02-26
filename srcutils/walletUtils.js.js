import { ethers } from 'ethers';

// Monad Testnet Chain ID and RPC URL
const MONAD_TESTNET_CHAIN_ID = '0x27AF'; // 10143 in decimal
const MONAD_TESTNET_RPC = 'https://testnet-rpc.monad.xyz';

// Connect wallet and initialize contract
export const connectWalletAndContract = async (walletProvider, contractAddress, contractABI) => {
  let web3Provider;
  let walletType = '';

  // Connect to different wallet types
  if (walletProvider === 'metamask') {
    if (!window.ethereum) throw new Error("MetaMask not found");
    web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    walletType = 'MetaMask';
  } else if (walletProvider === 'phantom') {
    if (!window.solana || !window.solana.isPhantom) throw new Error("Phantom wallet not found");
    await window.solana.connect();
    web3Provider = new ethers.providers.JsonRpcProvider(MONAD_TESTNET_RPC); // Phantom uses Solana, not Ethereum
    walletType = 'Phantom';
  } else if (walletProvider === 'rabby') {
    if (!window.ethereum) throw new Error("Rabby not found");
    web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    walletType = 'Rabby';
  } else if (walletProvider === 'backpack') {
    if (!window.backpack) throw new Error("Backpack not found");
    web3Provider = new ethers.providers.JsonRpcProvider(MONAD_TESTNET_RPC); // Adjusted for Backpack
    walletType = 'Backpack';
  } else {
    throw new Error("Unsupported wallet provider");
  }

  // Request account access
  if (walletProvider !== 'phantom') {
    await web3Provider.provider.request({ method: 'eth_requestAccounts' });
  }

  // Check if connected to Monad testnet
  const chainId = await web3Provider.provider.request({ method: 'eth_chainId' });
  if (chainId !== MONAD_TESTNET_CHAIN_ID && walletProvider !== 'phantom') {
    try {
      await web3Provider.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await web3Provider.provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: MONAD_TESTNET_CHAIN_ID,
            chainName: 'Monad Testnet',
            nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
            rpcUrls: [MONAD_TESTNET_RPC],
            blockExplorerUrls: ['https://testnet.monadexplorer.com']
          }],
        });
      } else {
        throw switchError;
      }
    }
  }

  // Create ethers provider and signer
  const signer = web3Provider.getSigner();
  const account = walletProvider === 'phantom' ? window.solana.publicKey.toString() : await signer.getAddress();
  const balance = await web3Provider.getBalance(account);

  // Initialize contract with the signer (only if not using Phantom)
  let contract, contractBalance, commissionRate;
  if (walletProvider !== 'phantom') {
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    contractBalance = await contract.getContractBalance();
    commissionRate = await contract.commissionRate();
  }

  return {
    provider: web3Provider,
    signer,
    account,
    balance: ethers.utils.formatEther(balance),
    contract: contract || null,
    contractBalance: contract ? ethers.utils.formatEther(contractBalance) : null,
    walletType,
    commissionRate: commissionRate ? commissionRate.toNumber() : null
  };
};
