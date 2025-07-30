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

// Load piece count from Firebase when page loads
pieceCountRef.on('value', (snapshot) => {
  const count = snapshot.val();
  pieceCount = count || 0;
  updateDisplay();
});

function updateDisplay() {
  // Update counter display
  document.getElementById('pieceCount').textContent = pieceCount;
  
  // Update remove button state
  const removeButton = document.querySelector('.remove-piece-btn');
  if (removeButton) {
      removeButton.disabled = pieceCount <= 0;
  }
  
  // Get pieces container
  const piecesContainer = document.getElementById('piecesContainer');
  
  // Clear existing pieces
  piecesContainer.innerHTML = '';
  
  if (pieceCount === 0) {
      piecesContainer.innerHTML = '<div class="empty-message">Click the button to add pieces!</div>';
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
}

function addPiece() {
  // Increment piece count in Firebase
  pieceCountRef.transaction((currentCount) => {
      return (currentCount || 0) + 1;
  });
  
  // Add visual feedback to button
  const button = document.querySelector('.add-piece-btn');
  button.style.animation = 'none';
  setTimeout(() => {
      button.style.animation = '';
  }, 10);
}

function removePiece() {
  // Decrement piece count in Firebase, but don't go below 0
  pieceCountRef.transaction((currentCount) => {
      const current = currentCount || 0;
      return current > 0 ? current - 1 : 0;
  });
  
  // Add visual feedback to button
  const button = document.querySelector('.remove-piece-btn');
  button.style.animation = 'none';
  setTimeout(() => {
      button.style.animation = '';
  }, 10);
}

function goToGamesPage() {
  window.location.href = 'games.html';
}

function goToBigOrSmallPage() {
  window.location.href = 'bigorsmall.html';
}

// Add some interactive hover effects
/*
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.box').forEach(box => {
      box.addEventListener('mouseenter', function() {
          this.style.transform = 'translateY(-10px) scale(1.02)';
      });
      
      box.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0) scale(1)';
      });
  });
});
*/