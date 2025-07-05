let dbRef = firebase.database().ref();
let currentUser = null;
let attractions = [];
let categoryStates = {}; // Para almacenar el estado de las categorías

window.addEventListener('DOMContentLoaded', async () => {
  // Cargar atracciones una sola vez
  attractions = await fetch('attractions.json').then(r => r.json());
  
  // Cargar estados de categorías guardados
  loadCategoryStates();
  
  setupAuth();
  document.getElementById('logout').onclick = logout;
  listenForRankingUpdates();
  
  // Ensure auth element is visible and reset animations
  const authElement = document.getElementById('auth');
  authElement.style.animation = '';
  authElement.classList.remove('hidden');
});

function loadCategoryStates() {
  try {
    const savedStates = localStorage.getItem('portaventura_category_states');
    if (savedStates) {
      categoryStates = JSON.parse(savedStates);
    }
  } catch (error) {
    console.error('Error loading category states:', error);
    categoryStates = {};
  }
}

function saveCategoryStates() {
  try {
    localStorage.setItem('portaventura_category_states', JSON.stringify(categoryStates));
  } catch (error) {
    console.error('Error saving category states:', error);
  }
}

function setupAuth() {
  const form = document.getElementById('auth-form');

  form.onsubmit = async e => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const snapshot = await dbRef.child('users/' + username).get();
      const userData = snapshot.val();

      if (!userData || userData.password !== password) {
        showToast('Usuario o contraseña inválidos', 'error');
        return;
      }
      
      currentUser = { username, ...userData, ridden: userData.ridden || [] };
      showApp();
    } catch (error) {
      console.error('Error durante el login:', error);
      showToast('Error durante el inicio de sesión. Por favor, intenta de nuevo.', 'error');
    }
  };
}

function logout() {
  const appElement = document.getElementById('app');
  const authElement = document.getElementById('auth');
  const userProfile = document.getElementById('user-profile');
  
  // Reset any existing animations
  authElement.style.animation = '';
  appElement.style.animation = '';
  
  // Hide user profile
  userProfile.classList.remove('visible');
  
  // Smooth transition with iOS-style animation
  appElement.style.animation = 'slideOutDown 0.3s ease-out forwards';
  
  setTimeout(() => {
    appElement.classList.add('hidden');
    authElement.classList.remove('hidden');
    authElement.style.animation = 'slideInUp 0.5s ease-out';
    
    // Reset form fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    
    // Reset auth state
    currentUser = null;
  }, 300);
}

function showApp() {
  const authElement = document.getElementById('auth');
  const appElement = document.getElementById('app');
  
  // Smooth transition with iOS-style animation
  authElement.style.animation = 'fadeOut 0.3s ease-out forwards';
  
  setTimeout(() => {
    authElement.classList.add('hidden');
    appElement.classList.remove('hidden');
    appElement.style.animation = 'slideInUp 0.5s ease-out';
    
    // Add success animation to elements
    setTimeout(() => {
      renderAttractions();
      renderStats();
      
      // Force ranking update immediately
      updateRanking();
      
      // Setup user profile functionality
      setupUserProfile();
      
      // Add success animation to cards
      document.querySelectorAll('.card').forEach((card, index) => {
        setTimeout(() => {
          card.classList.add('success-animation');
        }, index * 100);
      });
    }, 300);
  }, 300);
}

function renderAttractions() {
  const container = document.getElementById('categories-container');
  container.innerHTML = '';
  
  // Group attractions by category
  const categories = {};
  attractions.forEach((attr, index) => {
    if (!categories[attr.category]) {
      categories[attr.category] = [];
    }
    categories[attr.category].push({ ...attr, index });
  });
  
  // Create category sections
  Object.entries(categories).forEach(([categoryName, categoryAttractions], categoryIndex) => {
    const categorySection = document.createElement('div');
    categorySection.className = 'category-section';
    if (categoryName === 'PA DORMIRSE') {
      categorySection.classList.add('pa-dormirse');
    }
    
    // Category header
    const header = document.createElement('div');
    header.className = 'category-header';
    header.onclick = () => toggleCategory(categorySection, categoryName);
    
    const title = document.createElement('div');
    title.className = 'category-title';
    
    const colorDot = document.createElement('div');
    colorDot.className = `category-color ${categoryAttractions[0].color}`;
    
    const titleText = document.createElement('span');
    titleText.textContent = categoryName;
    
    title.appendChild(colorDot);
    title.appendChild(titleText);
    
    const arrow = document.createElement('div');
    arrow.className = 'category-arrow';
    arrow.innerHTML = '▼';
    
    header.appendChild(title);
    header.appendChild(arrow);
    
    // Category content
    const content = document.createElement('div');
    content.className = 'category-content';
    
    // Aplicar estado guardado
    const isCollapsed = categoryStates[categoryName] === true;
    if (isCollapsed) {
      header.classList.add('collapsed');
      content.classList.add('collapsed');
    }
    
    const attractionsList = document.createElement('ul');
    attractionsList.className = 'category-attractions';
    if (categoryName === 'PA DORMIRSE') {
      attractionsList.classList.add('pa-dormirse');
    }
    
    categoryAttractions.forEach((attr, attrIndex) => {
      const li = document.createElement('li');
      const isRidden = currentUser.ridden.includes(attr.index);
      
      const attractionInfo = document.createElement('div');
      attractionInfo.className = 'attraction-info';
      
      const name = document.createElement('span');
      name.className = 'attraction-name';
      name.textContent = attr.name;
      
      const points = document.createElement('span');
      points.className = 'attraction-points';
      points.textContent = `${attr.points}p`;
      
      attractionInfo.appendChild(name);
      attractionInfo.appendChild(points);
      
      const btn = document.createElement('button');
      btn.textContent = isRidden ? 'Desmarcar' : 'Marcar';
      btn.className = isRidden ? 'success' : '';
      btn.onclick = () => toggleRide(attr.index);
      
      li.appendChild(attractionInfo);
      li.appendChild(btn);
      
      // Add staggered animation
      li.style.opacity = '0';
      li.style.transform = 'translateY(20px)';
      
      attractionsList.appendChild(li);
      
      // Animate in with delay
      setTimeout(() => {
        li.style.transition = 'all 0.3s ease-out';
        li.style.opacity = '1';
        li.style.transform = 'translateY(0)';
      }, (categoryIndex * 100) + (attrIndex * 50));
    });
    
    content.appendChild(attractionsList);
    categorySection.appendChild(header);
    categorySection.appendChild(content);
    container.appendChild(categorySection);
  });
  
  document.getElementById('total-attractions').textContent = attractions.length;
  
  // Calculate max points
  const maxPoints = attractions.reduce((total, attr) => total + attr.points, 0);
  document.getElementById('max-points').textContent = maxPoints;
}

function toggleCategory(categorySection, categoryName) {
  const header = categorySection.querySelector('.category-header');
  const content = categorySection.querySelector('.category-content');
  
  const isCollapsed = header.classList.contains('collapsed');
  
  header.classList.toggle('collapsed');
  content.classList.toggle('collapsed');
  
  // Guardar el nuevo estado
  categoryStates[categoryName] = !isCollapsed;
  saveCategoryStates();
}

async function toggleRide(index) {
  const ridden = currentUser.ridden || [];
  const idx = ridden.indexOf(index);
  const button = event.target;
  
  // Add loading state
  button.classList.add('loading');
  button.textContent = '...';
  
  try {
    if (idx >= 0) ridden.splice(idx, 1);
    else ridden.push(index);
    
    await dbRef.child('users/' + currentUser.username + '/ridden').set(ridden);
    
    // Success animation
    button.classList.remove('loading');
    button.classList.add('success-animation');
    
    setTimeout(() => {
      renderAttractions();
      renderStats();
      updateRanking(); // Update ranking immediately after ride toggle
    }, 200);
    
  } catch (error) {
    button.classList.remove('loading');
    showToast('Error al actualizar. Inténtalo de nuevo.', 'error');
  }
}

function calculatePoints(riddenIndices) {
  return riddenIndices.reduce((total, index) => {
    return total + (attractions[index]?.points || 0);
  }, 0);
}

function renderStats(users = null) {
  const riddenCount = (currentUser.ridden || []).length;
  const totalPoints = calculatePoints(currentUser.ridden || []);
  const maxPoints = attractions.reduce((total, attr) => total + attr.points, 0);
  const pct = (totalPoints / maxPoints) * 100;
  
  document.getElementById('ridden-count').textContent = riddenCount;
  document.getElementById('total-points').textContent = totalPoints;
  
  const progressFill = document.getElementById('progress-fill');
  progressFill.style.width = pct + '%';
  
  // Add complete class if progress is 100%
  if (pct >= 100) {
    progressFill.classList.add('complete');
  } else {
    progressFill.classList.remove('complete');
  }
  
  // Render category stats
  renderCategoryStats();

  if (users) {
    const ranking = Object.entries(users).map(([username, data]) => ({
      username,
      ridden: data.ridden?.length || 0,
      points: calculatePoints(data.ridden || [])
    })).sort((a, b) => b.points - a.points);

    const ol = document.getElementById('ranking-list');
    ol.innerHTML = '';
    
    const maxPointsRanking = ranking.length > 0 ? ranking[0].points : 0;
    
    ranking.forEach((user, index) => {
      const li = document.createElement('li');
      
      // Add current user highlight
      if (currentUser && user.username === currentUser.username) {
        li.classList.add('current-user');
      }
      
      // Position badge
      const positionBadge = document.createElement('div');
      positionBadge.className = 'position-badge';
      
      if (index === 0) {
        positionBadge.classList.add('gold');
        positionBadge.innerHTML = '🥇';
      } else if (index === 1) {
        positionBadge.classList.add('silver');
        positionBadge.innerHTML = '🥈';
      } else if (index === 2) {
        positionBadge.classList.add('bronze');
        positionBadge.innerHTML = '🥉';
      } else {
        positionBadge.classList.add('other');
        positionBadge.textContent = index + 1;
      }
      
      // User info container
      const userInfo = document.createElement('div');
      userInfo.className = 'user-info';
      
      // Username
      const userName = document.createElement('div');
      userName.className = 'user-name';
      userName.textContent = user.username;
      
      // User stats
      const userStats = document.createElement('div');
      userStats.className = 'user-stats';
      userStats.textContent = `${user.ridden}/${attractions.length}`;
      
      // Points info
      const pointsInfo = document.createElement('div');
      pointsInfo.className = 'ranking-points';
      pointsInfo.textContent = `${user.points} puntos`;
      
      userInfo.appendChild(userName);
      userInfo.appendChild(userStats);
      userInfo.appendChild(pointsInfo);
      
      // Progress bar
      const progressContainer = document.createElement('div');
      progressContainer.className = 'ranking-progress';
      
      const progressFill = document.createElement('div');
      progressFill.className = 'ranking-progress-fill';
      const progressPercentage = maxPointsRanking > 0 ? (user.points / maxPointsRanking) * 100 : 0;
      progressFill.style.width = `${progressPercentage}%`;
      
      // Calculate total possible points
      const totalPossiblePoints = attractions.reduce((total, attr) => total + attr.points, 0);
      
      // Add complete class only if user has ALL possible points
      if (user.points >= totalPossiblePoints) {
        progressFill.classList.add('complete');
      }
      
      progressContainer.appendChild(progressFill);
      
      // Score display
      const scoreDisplay = document.createElement('div');
      scoreDisplay.className = 'score-display';
      
      const scoreNumber = document.createElement('div');
      scoreNumber.className = 'score-number';
      scoreNumber.textContent = user.points;
      
      scoreDisplay.appendChild(scoreNumber);
      
      // Assemble the ranking item
      const rankingPosition = document.createElement('div');
      rankingPosition.className = 'ranking-position';
      rankingPosition.appendChild(positionBadge);
      rankingPosition.appendChild(userInfo);
      rankingPosition.appendChild(progressContainer);
      
      li.appendChild(rankingPosition);
      li.appendChild(scoreDisplay);
      
      // Add staggered animation
      li.style.opacity = '0';
      li.style.transform = 'translateY(20px)';
      
      ol.appendChild(li);
      
      // Animate in with delay
      setTimeout(() => {
        li.style.transition = 'all 0.3s ease-out';
        li.style.opacity = '1';
        li.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }
}

async function updateRanking() {
  try {
    const snapshot = await dbRef.child('users').get();
    const allUsers = snapshot.val() || {};
    
    if (currentUser && allUsers[currentUser.username]) {
      currentUser.ridden = allUsers[currentUser.username].ridden || [];
    }
    
    renderStats(allUsers);
  } catch (error) {
    console.error('Error updating ranking:', error);
  }
}

function listenForRankingUpdates() {
  dbRef.child('users').on('value', snapshot => {
    const allUsers = snapshot.val() || {};
    if (currentUser && allUsers[currentUser.username]) {
      currentUser.ridden = allUsers[currentUser.username].ridden || [];
      renderStats(allUsers);
    }
  });
}

// User Profile Functions
function setupUserProfile() {
  const userProfile = document.getElementById('user-profile');
  const profileModal = document.getElementById('profile-modal');
  const closeModal = document.getElementById('close-modal');
  const profileForm = document.getElementById('profile-form');
  const deleteAccountBtn = document.getElementById('delete-account');
  
  // Update user name display
  updateUserNameDisplay();
  
  // Show user profile in correct position
  setTimeout(() => {
    userProfile.classList.add('visible');
  }, 100);
  
  // Open modal on user profile click
  userProfile.addEventListener('click', () => {
    openProfileModal();
  });
  
  // Close modal
  closeModal.addEventListener('click', () => {
    closeProfileModal();
  });
  
  // Close modal on overlay click
  profileModal.querySelector('.modal-overlay').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeProfileModal();
    }
  });
  
  // Handle form submission
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await updateUserProfile();
  });
  
  // Handle account deletion
  deleteAccountBtn.addEventListener('click', () => {
    openDeleteConfirmModal();
  });
}

function updateUserNameDisplay() {
  const userNameDisplay = document.getElementById('user-name-display');
  if (currentUser && userNameDisplay) {
    userNameDisplay.textContent = currentUser.username;
  }
}

function openProfileModal() {
  const modal = document.getElementById('profile-modal');
  const usernameInput = document.getElementById('profile-username');
  const passwordInput = document.getElementById('profile-password');
  const confirmPasswordInput = document.getElementById('profile-confirm-password');
  
  // Fill current values
  usernameInput.value = currentUser.username;
  passwordInput.value = '';
  confirmPasswordInput.value = '';
  
  // Show modal
  modal.classList.remove('hidden');
}

function closeProfileModal() {
  const modal = document.getElementById('profile-modal');
  modal.classList.add('hidden');
}

async function updateUserProfile() {
  const usernameInput = document.getElementById('profile-username');
  const passwordInput = document.getElementById('profile-password');
  const confirmPasswordInput = document.getElementById('profile-confirm-password');
  
  const newUsername = usernameInput.value.trim();
  const newPassword = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  // Validation
  if (!newUsername) {
    showToast('El nombre de usuario no puede estar vacío', 'error');
    return;
  }
  
  if (newPassword && newPassword !== confirmPassword) {
    showToast('Las contraseñas no coinciden', 'error');
    return;
  }
  
  if (newPassword && newPassword.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }
  
  try {
    // Check if new username already exists (if username is changing)
    if (newUsername !== currentUser.username) {
      const snapshot = await dbRef.child('users/' + newUsername).get();
          if (snapshot.exists()) {
      showToast('El nombre de usuario ya existe', 'error');
      return;
    }
    }
    
    // Prepare update data
    const updateData = {};
    
    // If username is changing, we need to move the data
    if (newUsername !== currentUser.username) {
      // Copy current user data to new username
      const currentUserData = {
        password: newPassword || currentUser.password,
        ridden: currentUser.ridden || []
      };
      
      // Set new user data
      await dbRef.child('users/' + newUsername).set(currentUserData);
      
      // Remove old user data
      await dbRef.child('users/' + currentUser.username).remove();
      
      // Update current user
      currentUser.username = newUsername;
      currentUser.password = currentUserData.password;
    } else if (newPassword) {
      // Only update password
      await dbRef.child('users/' + currentUser.username + '/password').set(newPassword);
      currentUser.password = newPassword;
    }
    
    // Update display
    updateUserNameDisplay();
    
    // Close modal
    closeProfileModal();
    
    // Show success message
    showToast('Perfil actualizado correctamente', 'success');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('Error al actualizar el perfil. Inténtalo de nuevo.', 'error');
  }
}

function openDeleteConfirmModal() {
  const deleteConfirmModal = document.getElementById('delete-confirm-modal');
  const closeDeleteModal = document.getElementById('close-delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  
  // Close profile modal
  closeProfileModal();
  
  // Show delete confirmation modal
  deleteConfirmModal.classList.remove('hidden');
  
  // Close modal handlers
  closeDeleteModal.addEventListener('click', closeDeleteConfirmModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
  
  // Confirm deletion
  confirmDeleteBtn.addEventListener('click', async () => {
    await deleteUserAccount();
  });
  
  // Close on overlay click
  deleteConfirmModal.querySelector('.modal-overlay').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      closeDeleteConfirmModal();
    }
  });
}

function closeDeleteConfirmModal() {
  const deleteConfirmModal = document.getElementById('delete-confirm-modal');
  deleteConfirmModal.classList.add('hidden');
}

async function deleteUserAccount() {
  try {
    // Remove user data from database
    await dbRef.child('users/' + currentUser.username).remove();
    
    // Close modal
    closeDeleteConfirmModal();
    
    // Show success notification
    showSuccessNotification('Cuenta eliminada correctamente');
    
    // Logout user after a short delay
    setTimeout(() => {
      logout();
    }, 1500);
    
  } catch (error) {
    console.error('Error deleting account:', error);
    showSuccessNotification('Error al eliminar la cuenta. Inténtalo de nuevo.');
  }
}

// Toast Notification System
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Get icon based on type
  const icon = getToastIcon(type);
  
  toast.innerHTML = `
    <div class="toast-icon">
      ${icon}
    </div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
      </svg>
    </button>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto remove after duration
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 400);
    }
  }, duration);
}

function getToastIcon(type) {
  switch (type) {
    case 'success':
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z" fill="currentColor"/>
      </svg>`;
    case 'error':
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
      </svg>`;
    case 'warning':
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 21H23L12 2L1 21ZM13 18H11V16H13V18ZM13 14H11V12H13V14Z" fill="currentColor"/>
      </svg>`;
    case 'info':
    default:
      return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
      </svg>`;
  }
}

function showSuccessNotification(message) {
  showToast(message, 'success');
}

function renderCategoryStats() {
  const categoryStatsContainer = document.getElementById('category-stats');
  if (!categoryStatsContainer) return;
  
  // Group attractions by category
  const categories = {};
  attractions.forEach((attr, index) => {
    if (!categories[attr.category]) {
      categories[attr.category] = {
        name: attr.category,
        color: attr.color,
        total: 0,
        completed: 0
      };
    }
    categories[attr.category].total++;
    
    // Check if this attraction is completed
    if (currentUser.ridden && currentUser.ridden.includes(index)) {
      categories[attr.category].completed++;
    }
  });
  
  // Clear container
  categoryStatsContainer.innerHTML = '';
  
  // Create category stat elements
  Object.values(categories).forEach(category => {
    const categoryStat = document.createElement('div');
    categoryStat.className = 'category-stat';
    
    const colorDot = document.createElement('div');
    colorDot.className = `category-stat-color ${category.color}`;
    
    const categoryCount = document.createElement('div');
    categoryCount.className = 'category-stat-count';
    categoryCount.textContent = `${category.completed}/${category.total}`;
    
    categoryStat.appendChild(colorDot);
    categoryStat.appendChild(categoryCount);
    
    categoryStatsContainer.appendChild(categoryStat);
  });
}