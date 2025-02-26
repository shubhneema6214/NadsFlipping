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
    web3Provider = window.ethereum;
    walletType = 'MetaMask';
  } else if (walletProvider === 'phantom') {
    if (!window.solana) throw new Error("Phantom not found");
    // Use solana provider
    try {
      const solProvider = window.solana;
      await solProvider.connect();
      // For Solana wallets in EVM mode, they often expose ethereum provider
      web3Provider = window.ethereum; 
      walletType = 'Phantom';
    } catch (error) {
      throw new Error("Failed to connect to Phantom wallet: " + error.message);
    }
  } else if (walletProvider === 'rabby') {
    // Detect Rabby wallet by checking user agent or wallet properties
    if (!window.ethereum) throw new Error("Rabby not found");
    web3Provider = window.ethereum;
    walletType = 'Rabby';
  } else if (walletProvider === 'backpack') {
    // Detect Backpack wallet
    if (!window.ethereum) throw new Error("Backpack not found");
    web3Provider = window.ethereum;
    walletType = 'Backpack';
  } else {
    throw new Error("Unsupported wallet provider");
  }

  // Request account access
  await web3Provider.request({ method: 'eth_requestAccounts' });
  
  // Check if connected to Monad testnet
  const chainId = await web3Provider.request({ method: 'eth_chainId' });
  if (chainId !== MONAD_TESTNET_CHAIN_ID) {
    try {
      await web3Provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET_CHAIN_ID }],
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to the user's wallet
      if (switchError.code === 4902) {
        await web3Provider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: MONAD_TESTNET_CHAIN_ID,
            chainName: 'Monad Testnet',
            nativeCurrency: {
              name: 'MON',
              symbol: 'MON',
              decimals: 18
            },
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
  const ethersProvider = new ethers.providers.Web3Provider(web3Provider);
  const signer = ethersProvider.getSigner();
  const account = await signer.getAddress();
  const balance = await ethersProvider.getBalance(account);
  
  // Initialize contract with the signer
  const contract = new ethers.Contract(contractAddress, contractABI, signer);
  
  // Get contract balance and commission rate with proper error handling
  let contractBalance = ethers.BigNumber.from(0);
  let commissionRate = 10; // Default to 10%
  
  try {
    contractBalance = await contract.getContractBalance();
  } catch (error) {
    console.error("Error fetching contract balance:", error);
  }
  
  try {
    commissionRate = await contract.commissionRate();
    commissionRate = commissionRate.toNumber();
  } catch (error) {
    console.error("Error fetching commission rate:", error);
  }
  
  return {
    provider: ethersProvider,
    signer,
    account,
    balance: ethers.utils.formatEther(balance),
    contract,
    contractBalance: ethers.utils.formatEther(contractBalance),
    walletType,
    commissionRate
  };
};