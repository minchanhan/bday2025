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
const pieceCountRef = database.ref('pieceCount');

let pieceCount = 0;
let shoppingCart = [];

// Load piece count from Firebase when page loads
pieceCountRef.on('value', (snapshot) => {
  const count = snapshot.val();
  pieceCount = count || 0;
  updateDisplay();
});

function updateDisplay() {
  // Update counter display
  document.getElementById('pieceCount').textContent = pieceCount;
  
  // Get pieces container
  const piecesContainer = document.getElementById('piecesContainer');
  
  // Clear existing pieces
  piecesContainer.innerHTML = '';
  
  if (pieceCount === 0) {
      piecesContainer.innerHTML = '<div class="empty-message">No pieces yet! Go back to collect some.</div>';
  } else {
      // Create pieces based on current count
      for (let i = 0; i < pieceCount; i++) {
          const piece = document.createElement('div');
          piece.className = 'piece';
          // Add slight delay for visual effect when loading
          piece.style.animationDelay = `${i * 0.05}s`;
          piecesContainer.appendChild(piece);
      }
  }
  
  // Update game box affordability
  updateGameAffordability();
  
  // Update shopping cart
  updateShoppingCart();
}

function updateGameAffordability() {
  const gameBoxes = document.querySelectorAll('.game-box');
  const pieceCosts = [3,2,5,9]; // Costs for each game
  
  gameBoxes.forEach((box, index) => {
      const cost = pieceCosts[index];
      const gameTitle = box.querySelector('.game-title').textContent;
      
      if (pieceCount >= cost) {
          box.style.opacity = '1';
          box.style.filter = 'none';
          box.classList.add('affordable');
      } else {
          box.style.opacity = '0.6';
          box.style.filter = 'grayscale(0.5)';
          box.classList.remove('affordable');
      }
  });
}

function updateShoppingCart() {
  const cartItems = document.getElementById('cartItems');
  const cartTotal = document.getElementById('cartTotal');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  // Clear cart items
  cartItems.innerHTML = '';
  
  if (shoppingCart.length === 0) {
      cartItems.innerHTML = '<div class="empty-cart-message">No items selected</div>';
      cartTotal.textContent = 'Total: 0 pieces';
      checkoutBtn.disabled = true;
  } else {
      // Add cart items
      shoppingCart.forEach((item, index) => {
          const cartItem = document.createElement('div');
          cartItem.className = 'cart-item';
          cartItem.innerHTML = `
              <span class="cart-item-name">${item.name}</span>
              <span class="cart-item-cost">${item.cost} 
                <img src="images/piecetoken.gif" width="12px" height="12px">
              </span>
              <button class="remove-item-btn" onclick="removeFromCart(${index})">×</button>
          `;
          cartItems.appendChild(cartItem);
      });
      
      // Calculate total
      const total = shoppingCart.reduce((sum, item) => sum + item.cost, 0);
      cartTotal.textContent = `Total: ${total} pieces`;
      
      // Enable/disable checkout based on affordability
      checkoutBtn.disabled = total > pieceCount;
  }
}

function addToCart(gameName, cost) {
  // Add to cart
  shoppingCart.push({ name: gameName, cost: cost });
  updateDisplay();
  
  // Visual feedback
  const gameBox = Array.from(document.querySelectorAll('.game-box')).find(
      box => box.querySelector('.game-title').textContent === gameName
  );
  if (gameBox) {
      gameBox.style.transform = 'skew(-1deg) scale(0.95)';
      setTimeout(() => {
          gameBox.style.transform = 'skew(-1deg) scale(1)';
      }, 200);
  }
}

function removeFromCart(index) {
  shoppingCart.splice(index, 1);
  updateDisplay();
}

function checkout() {
  if (shoppingCart.length === 0) return;
  
  const total = shoppingCart.reduce((sum, item) => sum + item.cost, 0);
  if (total > pieceCount) {
      alert(`You need ${total - pieceCount} more pieces to complete this purchase!`);
      return;
  }
  
  const gameNames = shoppingCart.map(item => item.name).join(', ');
  
  if (confirm(`Purchase ${shoppingCart.length} prize(s) for ${total} pieces?\n\nPrizes: ${gameNames}`)) {
      // Deduct pieces from Firebase
      pieceCountRef.transaction((currentCount) => {
          const current = currentCount || 0;
          return current >= total ? current - total : current;
      });
      
      // Clear cart
      const purchasedGames = [...shoppingCart];
      shoppingCart = [];
      updateDisplay();
      
      // Show success message
      setTimeout(() => {
          alert(`Successfully purchased: ${gameNames}\n\nEnjoy your prizes, happy birthday my love!`);
      }, 500);
  }
}

function goBack() {
  window.location.href = 'index.html';
}

// Add some interactive hover effects
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.game-box').forEach(box => {
      box.addEventListener('mouseenter', function() {
          if (this.classList.contains('affordable')) {
              this.style.transform = 'skew(-1deg) translateY(-10px) scale(1.03)';
          }
      });
      
      box.addEventListener('mouseleave', function() {
          this.style.transform = 'skew(-1deg) translateY(0) scale(1)';
      });
      
      box.addEventListener('click', function() {
          const pieceCostElement = this.querySelector('.piece-cost');
          const cost = parseInt(pieceCostElement.dataset.cost);
          const gameTitle = this.querySelector('.game-title').textContent;
          
          // Add to cart instead of immediate purchase
          addToCart(gameTitle, cost);
      });
  });
});