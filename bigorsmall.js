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
  
  // Game state - simplified without dealer data
  let gameState = {
    players: {},
    currentRound: 1,
    currentcontestant: 1,
    gamePhase: 'waiting', // waiting, contestant_card, betting, reveal, round_end, game_end
    contestantCard: null,
    bet: null,
    roundResults: []
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
  
        // Initialize player data with dealer deck
        const playerData = {
            name: playerName,
            chips: 10,
            deck: [0,1,2,3,4,5,6,7,8,9,10],
            ready: false,
            connected: true,
            // Each player gets their own dealer deck and current card
            dealerDeck: [1,2,3,4,5,6,7,8,9],
            dealerCurrentCard: null
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
  
    // Update dealer deck counts using player data
    if (player1 && player1.dealerDeck) {
        document.getElementById('dealerDeck1Count').textContent = player1.dealerDeck.length;
    } else {
        document.getElementById('dealerDeck1Count').textContent = '9';
    }
    
    if (player2 && player2.dealerDeck) {
        document.getElementById('dealerDeck2Count').textContent = player2.dealerDeck.length;
    } else {
        document.getElementById('dealerDeck2Count').textContent = '9';
    }
  
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
  
    // Get current dealer's card from the contestant player's data
    const contestantPlayer = players[`player${gameState.currentcontestant}`];
    const dealerCard = contestantPlayer?.dealerCurrentCard;
  
    switch (gameState.gamePhase) {
        case 'waiting':
            const playerCount = Object.keys(players).length;
            status = `Waiting for players... (${playerCount}/2)`;
            break;
        case 'contestant_card':
            status = `Round ${gameState.currentRound}: ${contestantName} (contestant) - choose your card! Dealer played: ${dealerCard}`;
            break;
        case 'betting':
            status = `Round ${gameState.currentRound}: ${bettorName} (bettor) - place your bet! Dealer: ${dealerCard}`;
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
        // Start the game by immediately dealing dealer card and moving to contestant phase
        setTimeout(() => {
            startNewRound(players);
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
    updateCardSlots(players);
  }
  
  function startNewRound(players) {
    // Get the contestant player data
    const contestantPlayer = players[`player${gameState.currentcontestant}`];
    
    // PREVENT MULTIPLE EXECUTIONS: If dealer already has a card for this round, don't run again
    if (contestantPlayer.dealerCurrentCard != null) {
        console.log(`Round ${gameState.currentRound}: Dealer already has a card, skipping startNewRound`);
        return;
    }
    
    if (!contestantPlayer.dealerDeck || contestantPlayer.dealerDeck.length === 0) {
        console.error('Dealer deck is empty!');
        return;
    }
    
    // Choose dealer card from the contestant's dealer deck
    const randomIndex = Math.floor(Math.random() * contestantPlayer.dealerDeck.length);
    const dealerCard = contestantPlayer.dealerDeck[randomIndex];
    
    console.log(`Round ${gameState.currentRound}: Dealer for player ${gameState.currentcontestant} playing card ${dealerCard} from deck of ${contestantPlayer.dealerDeck.length} cards`);
    
    // Remove card from dealer deck and set as current card
    contestantPlayer.dealerDeck.splice(randomIndex, 1);
    contestantPlayer.dealerCurrentCard = dealerCard;
    
    console.log(`Player ${gameState.currentcontestant} dealer deck after removal:`, [...contestantPlayer.dealerDeck]);
  
    // Update player data in Firebase
    database.ref(`games/${gameId}/players/player${gameState.currentcontestant}`).set(contestantPlayer);
  
    // Move directly to contestant card phase
    gameState.gamePhase = 'contestant_card';
    updateGameState();
  }
  
  function playCard(cardValue) {
    if (gameState.gamePhase !== 'contestant_card' || currentPlayer !== `player${gameState.currentcontestant}`) {
        return;
    }
  
    // Set contestant card in gameState and update Firebase atomically
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
  
  function updateCardSlots(players) {
    const dealerSlot = document.getElementById('dealerCardSlot');
    const contestantSlot = document.getElementById('contestantCardSlot');
  
    // Get current dealer's card from contestant player data
    const contestantPlayer = players[`player${gameState.currentcontestant}`];
    const dealerCard = contestantPlayer?.dealerCurrentCard;
  
    // Dealer card is now always face up when placed
    if (dealerCard != null) {
        dealerSlot.innerHTML = `<div class="card">${dealerCard}</div><div class="card-slot-label">Dealer's Card</div>`;
    } else {
        dealerSlot.innerHTML = `<div class="card-slot-label">Dealer's Card</div>`;
    }
  
    // Better contestant card handling
    if (gameState.gamePhase === 'reveal' || gameState.gamePhase === 'round_end') {
        // Show contestant card face up
        if (gameState.contestantCard != null) {
            contestantSlot.innerHTML = `<div class="card">${gameState.contestantCard}</div><div class="card-slot-label">Contestant's Card</div>`;
        } else {
            contestantSlot.innerHTML = `<div class="card">ERROR</div><div class="card-slot-label">Contestant's Card</div>`;
        }
    } else if (gameState.gamePhase === 'betting' && gameState.contestantCard != null) {
        // Show contestant card face down during betting
        contestantSlot.innerHTML = `<div class="card face-down">?</div><div class="card-slot-label">Contestant's Card</div>`;
    } else {
        // Show empty slot
        contestantSlot.innerHTML = `<div class="card-slot-label">Contestant's Card</div>`;
    }
  }
  
  function revealCards() {
    // Get data from players
    database.ref(`games/${gameId}/players`).once('value', (snapshot) => {
        const players = snapshot.val();
        const contestantPlayer = players[`player${gameState.currentcontestant}`];
        const dealerCard = contestantPlayer.dealerCurrentCard;
        const contestantCard = gameState.contestantCard;
        const bet = gameState.bet;
  
        // Add validation to prevent undefined card issues
        if (dealerCard == null || contestantCard == null || !bet) {
            console.error('Card reveal error - missing cards or bet', {dealerCard, contestantCard, bet});
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
  
        // Update contestant chips
        const contestantPlayerId = `player${gameState.currentcontestant}`;
        players[contestantPlayerId].chips += contestantWinnings;
  
        // Update bettor chips
        const bettorPlayer = bet.player;
        players[bettorPlayer].chips -= bet.amount; // Remove original bet
        if (bettorResult !== 'lose') {
            players[bettorPlayer].chips += bettorWinnings; // Add winnings (includes original bet for tie)
        }
  
        // Save updated player data
        database.ref(`games/${gameId}/players`).set(players);
  
        // Check for game end conditions
        if (players.player1.chips <= 0 || players.player2.chips <= 0 || gameState.currentRound >= 18) {
            endGame(players);
        } else {
            gameState.gamePhase = 'round_end';
            updateGameState();
        }
  
        // Show results to ALL players
        showRoundResults(dealerCard, contestantCard, bet, contestantWinnings, bettorResult, bettorWinnings);
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
    const contestantPlayer = players[`player${gameState.currentcontestant}`];
    const dealerCard = contestantPlayer?.dealerCurrentCard;
    
    if (dealerCard != null && gameState.contestantCard != null) {
        const comparison = gameState.contestantCard > dealerCard ? 'BIGGER' : 
                         gameState.contestantCard < dealerCard ? 'SMALLER' : 'TIED';
        finalRoundResults = `
            <div class="final-round-results">
                <h3>Final Round Results</h3>
                <p><strong>Dealer's Card:</strong> ${dealerCard}</p>
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
        // Reset local state - simplified without dealer data
        gameState = {
            players: {},
            currentRound: 1,
            currentcontestant: 1,
            gamePhase: 'waiting',
            contestantCard: null,
            bet: null,
            roundResults: []
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
  
            // Clear current dealer's card for the round that just ended
            const contestantPlayer = players[`player${gameState.currentcontestant}`];
            contestantPlayer.dealerCurrentCard = null;
            
            // Update the contestant player with cleared card
            database.ref(`games/${gameId}/players/player${gameState.currentcontestant}`).set(contestantPlayer);
  
            // Move to next round
            gameState.currentRound++;
            gameState.currentcontestant = gameState.currentcontestant === 1 ? 2 : 1; // Switch roles
            gameState.contestantCard = null;
            gameState.bet = null;
            
            updateGameState();
            
            // Start the new round immediately
            setTimeout(() => {
                database.ref(`games/${gameId}/players`).once('value', (snapshot) => {
                    const updatedPlayers = snapshot.val();
                    startNewRound(updatedPlayers);
                });
            }, 500);
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