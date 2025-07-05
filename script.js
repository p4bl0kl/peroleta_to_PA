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
  const toggleLink = document.getElementById('toggle-link');
  const authTitle = document.getElementById('auth-title');
  const authButton = document.getElementById('auth-button');
  let isLogin = true;

  toggleLink.onclick = () => {
    isLogin = !isLogin;
    authTitle.textContent = isLogin ? 'Iniciar Sesión' : 'Registro';
    authButton.textContent = isLogin ? 'Entrar' : 'Registrar';
    toggleLink.textContent = isLogin ? 'Regístrate' : 'Inicia Sesión';
  };

  form.onsubmit = async e => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const snapshot = await dbRef.child('users/' + username).get();
    const userData = snapshot.val();

    if (isLogin) {
      if (!userData || userData.password !== password) return alert('Usuario o contraseña inválidos');
      currentUser = { username, ...userData, ridden: userData.ridden || [] };
      showApp();
    } else {
      if (userData) return alert('Usuario ya existe');
      const newUser = { password, ridden: [] };
      await dbRef.child('users/' + username).set(newUser);
      alert('Registro exitoso');
    }
  };
}

function logout() {
  const appElement = document.getElementById('app');
  const authElement = document.getElementById('auth');
  
  // Reset any existing animations
  authElement.style.animation = '';
  appElement.style.animation = '';
  
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
    alert('Error al actualizar. Inténtalo de nuevo.');
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
  document.getElementById('progress-fill').style.width = pct + '%';

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
      userStats.textContent = `${user.ridden} atracciones completadas`;
      
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
      
      progressContainer.appendChild(progressFill);
      
      // Score display
      const scoreDisplay = document.createElement('div');
      scoreDisplay.className = 'score-display';
      
      const scoreNumber = document.createElement('div');
      scoreNumber.className = 'score-number';
      scoreNumber.textContent = user.points;
      
      const scoreLabel = document.createElement('div');
      scoreLabel.className = 'score-label';
      scoreLabel.textContent = 'PUNTOS';
      
      scoreDisplay.appendChild(scoreNumber);
      scoreDisplay.appendChild(scoreLabel);
      
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