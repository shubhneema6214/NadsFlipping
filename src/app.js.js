import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import './App.css';
import CoinFlip from './components/CoinFlip';
import contractABI from './utils/contractABI.json';
import { connectWalletAndContract } from './utils/walletUtils';

// Replace with your actual deployed contract address
const CONTRACT_ADDRESS = "0xa668d8e939521858b11b5683a0b9177026fd482a";

function App() {
  // State variables
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [balance, setBalance] = useState('0');
  const [betAmount, setBetAmount] = useState('0.01');
  const [isFlipping, setIsFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState(null);
  const [hasWon, setHasWon] = useState(null);
  const [contractBalance, setContractBalance] = useState('0');
  const [commissionRate, setCommissionRate] = useState(10);
  const [error, setError] = useState('');
  const [walletType, setWalletType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txHistory, setTxHistory] = useState([]);

  // Refresh balances - using useCallback to avoid recreating this function unnecessarily
  const refreshBalances = useCallback(async () => {
    if (!provider || !account || !contract) return;
    
    try {
      const userBalance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(userBalance));
      
      try {
        const contractBal = await contract.getContractBalance();
        setContractBalance(ethers.utils.formatEther(contractBal));
      } catch (contractError) {
        console.error("Error getting contract balance:", contractError);
        // Don't update state if there's an error
      }
    } catch (error) {
      console.error("Error refreshing balances:", error);
    }
  }, [provider, account, contract]);

  // Set up event listeners
  const setupEventListeners = useCallback((provider) => {
    if (!provider) return;
    
    const eventProvider = provider.provider || provider;
    
    // Listen for account changes
    if (eventProvider.on) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          refreshBalances();
        } else {
          setAccount('');
        }
      };
      
      const handleChainChanged = () => {
        window.location.reload();
      };
      
      eventProvider.on('accountsChanged', handleAccountsChanged);
      eventProvider.on('chainChanged', handleChainChanged);
      
      // Return cleanup function
      return () => {
        if (eventProvider.removeListener) {
          eventProvider.removeListener('accountsChanged', handleAccountsChanged);
          eventProvider.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [refreshBalances]);

  // Connect wallet
  const connectWallet = async (walletProvider) => {
    setIsLoading(true);
    setError('');
    
    try {
      const connection = await connectWalletAndContract(
        walletProvider, 
        CONTRACT_ADDRESS, 
        contractABI
      );
      
      setProvider(connection.provider);
      setAccount(connection.account);
      setContract(connection.contract);
      setBalance(connection.balance);
      setContractBalance(connection.contractBalance);
      setWalletType(connection.walletType);
      setCommissionRate(connection.commissionRate);
      
    } catch (error) {
      console.error("Connection error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Bet on coin flip
  const placeBet = async (guess) => {
    if (!contract || !account) return;
    
    try {
      setError('');
      setIsFlipping(true);
      setCoinResult(null);
      setHasWon(null);

      // Parse bet amount to wei
      const betAmountWei = ethers.utils.parseEther(betAmount);
      
      // Calculate total with commission
      const totalAmount = betAmountWei.mul(100 + commissionRate).div(100);
      
      console.log(`Placing bet: ${guess ? "Heads" : "Tails"}`);
      console.log(`Bet amount: ${betAmount} ETH`);
      console.log(`Total with commission: ${ethers.utils.formatEther(totalAmount)} ETH`);

      // Send transaction
      const tx = await contract.flipCoin(guess, { 
        value: totalAmount,
        gasLimit: 300000 // Explicitly set gas limit
      });
      
      console.log("Transaction sent:", tx.hash);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction mined:", receipt);
      
      // Look for BetPlaced event
      const betEvent = receipt.events?.find(event => event.event === "BetPlaced");
      
      if (betEvent) {
        const [player, amount, outcome, won] = betEvent.args;
        
        // Update state based on event data
        setCoinResult(outcome ? "heads" : "tails");
        setHasWon(won);
        
        // Add to transaction history
        setTxHistory(prev => [
          {
            hash: tx.hash,
            amount: ethers.utils.formatEther(amount),
            guess: guess ? "Heads" : "Tails",
            outcome: outcome ? "Heads" : "Tails",
            won,
            timestamp: Date.now()
          },
          ...prev.slice(0, 9) // Keep most recent 10
        ]);
      } else {
        console.warn("BetPlaced event not found in transaction receipt");
        setCoinResult(guess ? "heads" : "tails");
        setHasWon(false);
      }
      
      // Refresh balances
      await refreshBalances();
      
      // Complete animation before resetting flip state
      setTimeout(() => {
        setIsFlipping(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error placing bet:", error);
      setError(error.message || "Transaction failed");
      setIsFlipping(false);
    }
  };

  // Calculate total with commission
  const calculateTotal = () => {
    try {
      const amount = parseFloat(betAmount) || 0;
      const commission = amount * (commissionRate / 100);
      return (amount + commission).toFixed(5);
    } catch {
      return "0.00";
    }
  };

  // Format address
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Effect to set up event listeners when provider changes
  useEffect(() => {
    if (provider) {
      const cleanup = setupEventListeners(provider);
      return cleanup;
    }
  }, [provider, setupEventListeners]);

  // Effect to refresh balances periodically
  useEffect(() => {
    if (account && provider && contract) {
      refreshBalances();
      
      const interval = setInterval(() => {
        refreshBalances();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [provider, account, contract, refreshBalances]);

  return (
    <div className="app">
      <header>
        <div className="logo">NadsFlip dApp</div>
        <div className="network">Monad Testnet</div>
        {account ? (
          <div className="account-info">
            <div className="balance">{parseFloat(balance).toFixed(4)} MON</div>
            <div className="address">
              {walletType}: {formatAddress(account)}
            </div>
          </div>
        ) : (
          <div className="connect-options">
            <button 
              onClick={() => connectWallet('metamask')}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'MetaMask'}
            </button>
            <button 
              onClick={() => connectWallet('phantom')}
              disabled={isLoading}
            >
              Phantom
            </button>
            <button 
              onClick={() => connectWallet('rabby')}
              disabled={isLoading}
            >
              Rabby
            </button>
            <button 
              onClick={() => connectWallet('backpack')}
              disabled={isLoading}
            >
              Backpack
            </button>
          </div>
        )}
      </header>

      <main>
        <CoinFlip 
          account={account}
          balance={balance}
          contractBalance={contractBalance}
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          calculateTotal={calculateTotal}
          placeBet={placeBet}
          isFlipping={isFlipping}
          coinResult={coinResult}
          hasWon={hasWon}
          error={error}
          refreshBalances={refreshBalances}
          txHistory={txHistory}
        />
      </main>

      <footer>
        <p>© 2025 NadsFlip - A coin flip dApp on Monad Testnet</p>
        <a 
          href={`https://testnet.monadexplorer.com/address/${CONTRACT_ADDRESS}`} 
          target="_blank" 
          rel="noopener noreferrer"
        >
          View Contract
        </a>
      </footer>
    </div>
  );
}

export default App;