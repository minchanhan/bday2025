// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAHeEkuHkc7tGtJuooIa9lwBM_4oY7mzTg",
  authDomain: "bday2025forcorrine.firebaseapp.com",
  databaseURL: "https://bday2025forcorrine-default-rtdb.firebaseio.com",
  projectId: "bday2025forcorrine",
  storageBucket: "bday2025forcorrine.firebasestorage.app",
  messagingSenderId: "1055523728496",
  appId: "1:1055523728496:web:54e1ef3ab4a766894858b5",
  measurementId: "G-GLCSLDLM4K"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Game state
let gameState = {
  players: {},
  currentRound: 1,
  currentcontestant: 1,
  gamePhase: 'waiting', // waiting, dealer_card, contestant_card, betting, reveal, round_end, game_end
  dealerCard: null,
  contestantCard: null,
  bet: null,
  roundResults: [],
  dealerDeck1: [1,2,3,4,5,6,7,8,9],
  dealerDeck2: [1,2,3,4,5,6,7,8,9]
};

let currentPlayer = null;
let gameId = 'bigOrSmallGame'; // Single game room

function goBack() {
  window.location.href = 'index.html';
}

function joinGame() {
  const playerName = document.getElementById('playerName').value.trim();
  if (!playerName) {
      alert('Please enter your name');
      return;
  }

  // Check if there's room in the game
  database.ref(`games/${gameId}/players`).once('value', (snapshot) => {
      const players = snapshot.val() || {};
      const playerCount = Object.keys(players).length;
      
      if (playerCount >= 2) {
          alert('Game is full. Please wait for a new game to start.');
          return;
      }

      // Find available player slot
      let playerId = 'player1';
      if (players.player1) {
          playerId = 'player2';
      }

      currentPlayer = playerId;

      // Initialize player data
      const playerData = {
          name: playerName,
          chips: 10,
          deck: [0,1,2,3,4,5,6,7,8,9,10],
          ready: false,
          connected: true
      };

      // Add player to game
      database.ref(`games/${gameId}/players/${playerId}`).set(playerData);

      // If this is the first player, initialize the game
      if (playerCount === 0) {
          database.ref(`games/${gameId}/gameState`).set(gameState);
      }

      // Hide setup and show game
      document.getElementById('gameSetup').style.display = 'none';
      document.getElementById('gameArea').style.display = 'block';
      document.getElementById('gameControls').style.display = 'block';

      // Start listening for game updates
      listenForGameUpdates();
  });
}

function listenForGameUpdates() {
  database.ref(`games/${gameId}`).on('value', (snapshot) => {
      const data = snapshot.val();
      if (!data) return;

      gameState = data.gameState || gameState;
      const players = data.players || {};

      updateUI(players);
      handleGamePhase(players);
  });
}

function updateUI(players) {
  // Update player info
  const player1 = players.player1;
  const player2 = players.player2;

  if (player1) {
      document.getElementById('player1Name').textContent = player1.name;
      document.getElementById('player1Chips').textContent = `${player1.chips} chips`;
      updatePlayerDeck('player1Deck', player1.deck, currentPlayer === 'player1');
  }

  if (player2) {
      document.getElementById('player2Name').textContent = player2.name;
      document.getElementById('player2Chips').textContent = `${player2.chips} chips`;
      updatePlayerDeck('player2Deck', player2.deck, currentPlayer === 'player2');
  }

  // Update dealer deck counts
  document.getElementById('dealerDeck1Count').textContent = gameState.dealerDeck1.length;
  document.getElementById('dealerDeck2Count').textContent = gameState.dealerDeck2.length;

  // Update game status
  updateGameStatus(players);
}

function updatePlayerDeck(deckId, deck, isCurrentPlayer) {
  const deckElement = document.getElementById(deckId);
  deckElement.innerHTML = '';

  deck.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = isCurrentPlayer ? 'mini-card' : 'mini-card face-down';
      cardElement.textContent = isCurrentPlayer ? card : '?';
      
      if (isCurrentPlayer && gameState.gamePhase === 'contestant_card' && 
          currentPlayer === `player${gameState.currentcontestant}`) {
          cardElement.onclick = () => playCard(card);
      }
      
      deckElement.appendChild(cardElement);
  });
}

function updateGameStatus(players) {
  let status = '';
  const contestantName = players[`player${gameState.currentcontestant}`]?.name || `Player ${gameState.currentcontestant}`;
  const bettorName = players[`player${gameState.currentcontestant === 1 ? 2 : 1}`]?.name || `Player ${gameState.currentcontestant === 1 ? 2 : 1}`;

  switch (gameState.gamePhase) {
      case 'waiting':
          const playerCount = Object.keys(players).length;
          status = `Waiting for players... (${playerCount}/2)`;
          break;
      case 'dealer_card':
          status = `Round ${gameState.currentRound}: Dealer is choosing a card...`;
          break;
      case 'contestant_card':
          status = `Round ${gameState.currentRound}: ${contestantName} (contestant) - choose your card!`;
          break;
      case 'betting':
          status = `Round ${gameState.currentRound}: ${bettorName} (bettor) - place your bet!`;
          break;
      case 'reveal':
          status = `Round ${gameState.currentRound}: Cards revealed!`;
          break;
      case 'round_end':
          status = `Round ${gameState.currentRound} complete. Waiting for players to be ready...`;
          break;
      case 'game_end':
          status = 'Game Over!';
          break;
  }

  document.getElementById('gameStatus').textContent = status;
}

function handleGamePhase(players) {
  const playerCount = Object.keys(players).length;
  
  if (playerCount === 2 && gameState.gamePhase === 'waiting') {
      // Start the game
      setTimeout(() => {
          gameState.gamePhase = 'dealer_card';
          updateGameState();
          dealerChooseCard();
      }, 1000);
  }

  // Show/hide betting area
  const bettingArea = document.getElementById('bettingArea');
  const readyBtn = document.getElementById('readyBtn');
  
  if (gameState.gamePhase === 'betting' && currentPlayer === `player${gameState.currentcontestant === 1 ? 2 : 1}`) {
      bettingArea.style.display = 'flex';
      
      // Update betting limits
      const currentPlayerData = players[currentPlayer];
      if (currentPlayerData) {
          const maxBet = currentPlayerData.chips;
          document.getElementById('bigBetAmount').max = maxBet;
          document.getElementById('smallBetAmount').max = maxBet;
      }
  } else {
      bettingArea.style.display = 'none';
  }

  if (gameState.gamePhase === 'round_end') {
      readyBtn.style.display = 'block';
  } else {
      readyBtn.style.display = 'none';
  }

  // Update card slots
  updateCardSlots();
}

function dealerChooseCard() {
  if (gameState.gamePhase !== 'dealer_card') return;

  const dealerDeck = gameState.currentcontestant === 1 ? gameState.dealerDeck1 : gameState.dealerDeck2;
  const randomIndex = Math.floor(Math.random() * dealerDeck.length);
  gameState.dealerCard = dealerDeck[randomIndex];
  
  // Remove card from dealer's deck
  if (gameState.currentcontestant === 1) {
      gameState.dealerDeck1.splice(randomIndex, 1);
      console.log("dealer deck 1:", [...gameState.dealerDeck1]); // shallow copy
  } else {
      gameState.dealerDeck2.splice(randomIndex, 1);
      console.log("dealer deck 2:", [...gameState.dealerDeck2]); // shallow copy
  }

  gameState.gamePhase = 'contestant_card';
  updateGameState();
}

function playCard(cardValue) {
  if (gameState.gamePhase !== 'contestant_card' || currentPlayer !== `player${gameState.currentcontestant}`) {
      return;
  }

  // FIXED: Set contestant card in gameState and update Firebase atomically
  gameState.contestantCard = cardValue;
  gameState.gamePhase = 'betting';
  
  // Remove card from player's deck locally first
  database.ref(`games/${gameId}/players/${currentPlayer}/deck`).once('value', (snapshot) => {
      const deck = snapshot.val();
      const cardIndex = deck.indexOf(cardValue);
      if (cardIndex > -1) {
          deck.splice(cardIndex, 1);
          
          // Update both player deck and game state atomically
          const updates = {};
          updates[`players/${currentPlayer}/deck`] = deck;
          updates['gameState'] = gameState;
          
          database.ref(`games/${gameId}`).update(updates);
      }
  });
}

function placeBet(betType) {
  if (gameState.gamePhase !== 'betting' || currentPlayer === `player${gameState.currentcontestant}`) {
      return;
  }

  const betAmount = parseInt(document.getElementById(`${betType}BetAmount`).value);
  if (!betAmount || betAmount <= 0) {
      alert('Please enter a valid bet amount');
      return;
  }

  database.ref(`games/${gameId}/players/${currentPlayer}`).once('value', (snapshot) => {
      const playerData = snapshot.val();
      if (betAmount > playerData.chips) {
          alert('Not enough chips!');
          return;
      }

      gameState.bet = {
          player: currentPlayer,
          type: betType,
          amount: betAmount
      };

      gameState.gamePhase = 'reveal';
      updateGameState();
      
      setTimeout(() => {
          revealCards();
      }, 1000);
  });
}

function updateCardSlots() {
  const dealerSlot = document.getElementById('dealerCardSlot');
  const contestantSlot = document.getElementById('contestantCardSlot');

  // Dealer card is now always face up when placed
  if (gameState.dealerCard !== null) {
      dealerSlot.innerHTML = `<div class="card">${gameState.dealerCard}</div><div class="card-slot-label">Dealer's Card</div>`;
  } else {
      dealerSlot.innerHTML = `<div class="card-slot-label">Dealer's Card</div>`;
  }

  // FIXED: Better contestant card handling
  if (gameState.gamePhase === 'reveal' || gameState.gamePhase === 'round_end') {
      // Show contestant card face up
      if (gameState.contestantCard !== null && gameState.contestantCard !== undefined) {
          contestantSlot.innerHTML = `<div class="card">${gameState.contestantCard}</div><div class="card-slot-label">Contestant's Card</div>`;
      } else {
          contestantSlot.innerHTML = `<div class="card">ERROR</div><div class="card-slot-label">Contestant's Card</div>`;
      }
  } else if (gameState.gamePhase === 'betting' && gameState.contestantCard !== null && gameState.contestantCard !== undefined) {
      // Show contestant card face down during betting
      contestantSlot.innerHTML = `<div class="card face-down">?</div><div class="card-slot-label">Contestant's Card</div>`;
  } else {
      // Show empty slot
      contestantSlot.innerHTML = `<div class="card-slot-label">Contestant's Card</div>`;
  }
}

function revealCards() {
  const dealerCard = gameState.dealerCard;
  const contestantCard = gameState.contestantCard;
  const bet = gameState.bet;

  // FIXED: Add validation to prevent undefined card issues
  if (dealerCard === null || dealerCard === undefined || 
      contestantCard === null || contestantCard === undefined || 
      !bet) {
      console.error('Card reveal error - missing cards or bet', {dealerCard, contestantCard, bet});
      alert('Error: Missing card data. Please refresh and try again.');
      return;
  }

  let contestantWinnings = 0;
  let bettorResult = 'tie';
  let bettorWinnings = 0;

  // Calculate contestant winnings
  if (contestantCard > dealerCard) {
      contestantWinnings = contestantCard - dealerCard;
  }

  // Calculate bettor result and winnings - Check tie first
  if (contestantCard === dealerCard) {
      bettorResult = 'tie';
      bettorWinnings = bet.amount; // Return original bet
  } else if (contestantCard > dealerCard && bet.type === 'big') {
      bettorResult = 'win';
      bettorWinnings = bet.amount * 2;
  } else if (contestantCard < dealerCard && bet.type === 'small') {
      bettorResult = 'win';
      bettorWinnings = bet.amount * 2;
  } else {
      bettorResult = 'lose';
      bettorWinnings = 0;
  }

  // Update player chips
  database.ref(`games/${gameId}/players`).once('value', (snapshot) => {
      const players = snapshot.val();
      
      // Update contestant chips
      const contestantPlayer = `player${gameState.currentcontestant}`;
      players[contestantPlayer].chips += contestantWinnings;

      // Update bettor chips
      const bettorPlayer = bet.player;
      players[bettorPlayer].chips -= bet.amount; // Remove original bet
      if (bettorResult !== 'lose') {
          players[bettorPlayer].chips += bettorWinnings; // Add winnings (includes original bet for tie)
      }

      // Save updated player data
      database.ref(`games/${gameId}/players`).set(players);

      // Show results
      showRoundResults(dealerCard, contestantCard, bet, contestantWinnings, bettorResult, bettorWinnings);

      // Check for game end conditions
      if (players.player1.chips <= 0 || players.player2.chips <= 0 || gameState.currentRound >= 18) {
          endGame(players);
      } else {
          gameState.gamePhase = 'round_end';
          updateGameState();
      }
  });
}

function showRoundResults(dealerCard, contestantCard, bet, contestantWinnings, bettorResult, bettorWinnings) {
  const comparison = contestantCard > dealerCard ? 'BIGGER' : 
                   contestantCard < dealerCard ? 'SMALLER' : 'TIE';
  
  const modalContent = `
      <h2>Round ${gameState.currentRound} Results</h2>
      <div class="round-result">
          <p><strong>Dealer's Card:</strong> ${dealerCard}</p>
          <p><strong>Contestant's Card:</strong> ${contestantCard}</p>
          <p><strong>Result:</strong> Contestant's card is ${comparison}</p>
          <br>
          <p><strong>Contestant Winnings:</strong> ${contestantWinnings} chips</p>
          <p><strong>Bet:</strong> ${bet.amount} chips on ${bet.type.toUpperCase()}</p>
          <p><strong>Bettor Result:</strong> ${bettorResult.toUpperCase()}</p>
          <p><strong>Bettor Winnings:</strong> ${bettorWinnings} chips</p>
      </div>
  `;
  
  showModal(modalContent);
}

function endGame(players) {
  gameState.gamePhase = 'game_end';
  
  let winner = '';
  if (players.player1.chips > players.player2.chips) {
      winner = players.player1.name;
  } else if (players.player2.chips > players.player1.chips) {
      winner = players.player2.name;
  } else {
      winner = 'TIE';
  }

  // Show final round results if available
  let finalRoundResults = '';
  if (gameState.dealerCard !== null && gameState.contestantCard !== null) {
      const comparison = gameState.contestantCard > gameState.dealerCard ? 'BIGGER' : 
                       gameState.contestantCard < gameState.dealerCard ? 'SMALLER' : 'TIED';
      finalRoundResults = `
          <div class="final-round-results">
              <h3>Final Round Results</h3>
              <p><strong>Dealer's Card:</strong> ${gameState.dealerCard}</p>
              <p><strong>Contestant's Card:</strong> ${gameState.contestantCard}</p>
              <p><strong>Result:</strong> Contestant's card is ${comparison}</p>
              <br>
          </div>
      `;
  }

  const modalContent = `
      <h2>Game Over!</h2>
      ${finalRoundResults}
      <div class="round-result">
          <p><strong>${players.player1.name}:</strong> ${players.player1.chips} chips</p>
          <p><strong>${players.player2.name}:</strong> ${players.player2.chips} chips</p>
          <br>
          <h3>${winner === 'TIE' ? "It's a tie!" : `${winner} wins!`}</h3>
      </div>
  `;
  
  showModal(modalContent);
  updateGameState();
}

function confirmResetGame() {
  if (confirm('Are you sure you want to reset the game? This will send all players back to the setup screen.')) {
      resetGame();
  }
}

function resetGame() {
  // Reset the entire game data
  database.ref(`games/${gameId}`).remove().then(() => {
      // Reset local state
      gameState = {
          players: {},
          currentRound: 1,
          currentcontestant: 1,
          gamePhase: 'waiting',
          dealerCard: null,
          contestantCard: null,
          bet: null,
          roundResults: [],
          dealerDeck1: [1,2,3,4,5,6,7,8,9],
          dealerDeck2: [1,2,3,4,5,6,7,8,9]
      };
      currentPlayer = null;
      
      // Show setup screen
      document.getElementById('gameSetup').style.display = 'block';
      document.getElementById('gameArea').style.display = 'none';
      document.getElementById('gameControls').style.display = 'none';
      
      // Clear player name input
      document.getElementById('playerName').value = '';
      
      closeModal();
  });
}

function readyForNextRound() {
  database.ref(`games/${gameId}/players/${currentPlayer}/ready`).set(true);

  // Check if both players are ready
  database.ref(`games/${gameId}/players`).once('value', (snapshot) => {
      const players = snapshot.val();
      if (players.player1?.ready && players.player2?.ready) {
          // Reset ready status
          database.ref(`games/${gameId}/players/player1/ready`).set(false);
          database.ref(`games/${gameId}/players/player2/ready`).set(false);

          // Move to next round
          gameState.currentRound++;
          gameState.currentcontestant = gameState.currentcontestant === 1 ? 2 : 1; // Switch roles
          gameState.dealerCard = null;
          gameState.contestantCard = null;
          gameState.bet = null;
          gameState.gamePhase = 'dealer_card';
          
          updateGameState();
          
          setTimeout(() => {
              dealerChooseCard();
          }, 1000);
      }
  });
}

function updateGameState() {
  database.ref(`games/${gameId}/gameState`).set(gameState);
}

function showModal(content) {
  document.getElementById('modalContent').innerHTML = content;
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (currentPlayer) {
      database.ref(`games/${gameId}/players/${currentPlayer}/connected`).set(false);
  }
});