import React from 'react';

const CoinFlip = ({
  account,
  balance,
  contractBalance,
  betAmount,
  setBetAmount,
  calculateTotal,
  placeBet,
  isFlipping,
  coinResult,
  hasWon,
  error,
  refreshBalances,
  txHistory
}) => {
  return (
    <div className="game-container">
      <div className="prize-pool">
        <h2>{parseFloat(contractBalance).toFixed(4)} MON</h2>
        <p>Available to Win</p>
      </div>

      <div className="bet-controls">
        <div className="bet-amount">
          <label>Wager</label>
          <div className="input-group">
            <input
              type="number"
              min="0.01"
              max="1" 
              step="0.01"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={isFlipping || !account}
            />
            <span>MON</span>
          </div>
          <div className="total-info">
            <p>Balance: {parseFloat(balance).toFixed(4)} MON</p>
            <p>Total with commission: {calculateTotal()} MON</p>
          </div>
        </div>

        <div className="coin-flip-controls">
          <button
            className="heads-button"
            onClick={() => placeBet(true)}
            disabled={isFlipping || !account}
          >
            Heads
          </button>
          <span>or</span>
          <button
            className="tails-button"
            onClick={() => placeBet(false)}
            disabled={isFlipping || !account}
          >
            Tails
          </button>
        </div>
      </div>

      <div className="coin-container">
        <div className={`coin ${isFlipping ? "flipping" : ""} ${coinResult ? coinResult : ""}`}>
          <div className="coin-side heads"></div>
          <div className="coin-side tails"></div>
        </div>
      </div>

      {hasWon !== null && (
        <div className={`result ${hasWon ? "win" : "lose"}`}>
          <h3>{hasWon ? "You won!" : "Better luck next time!"}</h3>
          <p>
            {hasWon
              ? `You won ${(parseFloat(betAmount) * 2).toFixed(4)} MON`
              : `You lost ${calculateTotal()} MON`}
          </p>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {txHistory.length > 0 && (
        <div className="history-container">
          <h3>Recent Flips</h3>
          <div className="tx-history">
            {txHistory.slice(0, 3).map((tx, index) => (
              <div key={index} className={`tx-item ${tx.won ? 'win' : 'lose'}`}>
                <div>Bet: {tx.amount} MON</div>
                <div>
                  {tx.guess} ⟶ {tx.outcome} ({tx.won ? 'Won' : 'Lost'})
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className="refresh-button"
        disabled={!account}
        onClick={refreshBalances}
      >
        Refresh
      </button>
    </div>
  );
};

export default CoinFlip;
