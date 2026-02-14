const loginPanel = document.getElementById('loginPanel');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const usersPanel = document.getElementById('usersPanel');
const productsPanel = document.getElementById('productsPanel');
const membershipsPanel = document.getElementById('membershipsPanel');
const usersBody = document.getElementById('usersBody');
const productsBody = document.getElementById('productsBody');
const membershipsBody = document.getElementById('membershipsBody');
const videosPanel = document.getElementById('videosPanel');
const videosBody = document.getElementById('videosBody');
const videoForm = document.getElementById('videoForm');
const videoStatus = document.getElementById('videoStatus');
const logoutBtn = document.getElementById('logoutBtn');
const refreshUsers = document.getElementById('refreshUsers');
const refreshProducts = document.getElementById('refreshProducts');
const refreshMemberships = document.getElementById('refreshMemberships');
const refreshVideos = document.getElementById('refreshVideos');

function setVisible(isAuthed) {
  loginPanel.style.display = isAuthed ? 'none' : 'block';
  usersPanel.style.display = isAuthed ? 'block' : 'none';
  productsPanel.style.display = isAuthed ? 'block' : 'none';
  membershipsPanel.style.display = isAuthed ? 'block' : 'none';
  videosPanel.style.display = isAuthed ? 'block' : 'none';
  logoutBtn.style.display = isAuthed ? 'inline-flex' : 'none';
}

async function api(url, options) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || 'Request failed';
    throw new Error(message);
  }
  return data;
}

async function checkAdmin() {
  try {
    await api('/api/admin/me');
    setVisible(true);
    await loadAll();
  } catch (err) {
    setVisible(false);
  }
}

async function loadAll() {
  await Promise.all([loadUsers(), loadProducts(), loadMemberships(), loadVideos()]);
}

async function loadUsers() {
  usersBody.innerHTML = '<tr><td colspan="9">Loading...</td></tr>';
  try {
    const users = await api('/api/admin/users');
    if (!users.length) {
      usersBody.innerHTML = '<tr><td colspan="9">No users found.</td></tr>';
      return;
    }
    usersBody.innerHTML = users
      .map(
        (user) => `
        <tr data-id="${user.id}">
          <td>${user.id}</td>
          <td><input class="row-input" type="text" value="${user.name || ''}" data-field="name" /></td>
          <td><input class="row-input" type="email" value="${user.email || ''}" data-field="email" /></td>
          <td><input class="row-input" type="text" value="${user.address || ''}" data-field="address" /></td>
          <td><input class="row-input" type="text" value="${user.gender || ''}" data-field="gender" /></td>
          <td><input class="row-input" type="text" value="${user.hobbies || ''}" data-field="hobbies" /></td>
          <td>${user.lastLogin || 'Never'}</td>
          <td><button class="btn ghost" data-action="save-user">Save</button></td>
          <td><button class="btn ghost" data-action="delete-user">Delete</button></td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    usersBody.innerHTML = `<tr><td colspan="9">${err.message}</td></tr>`;
  }
}

async function loadVideos() {
  videosBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
  try {
    const videos = await api('/api/admin/videos');
    if (!videos.length) {
      videosBody.innerHTML = '<tr><td colspan="7">No videos found.</td></tr>';
      return;
    }
    videosBody.innerHTML = videos
      .map(
        (video) => `
        <tr data-id="${video.id}">
          <td>${video.id}</td>
          <td><input class="row-input" type="text" value="${video.title || ''}" data-field="title" /></td>
          <td><input class="row-input" type="text" value="${video.category || ''}" data-field="category" /></td>
          <td><input class="row-input link" type="url" value="${video.url || ''}" data-field="url" /></td>
          <td><input class="row-input link" type="url" value="${video.thumbnail || ''}" data-field="thumbnail" /></td>
          <td><button class="btn ghost" data-action="save-video">Save</button></td>
          <td><button class="btn ghost" data-action="delete-video">Delete</button></td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    videosBody.innerHTML = `<tr><td colspan="7">${err.message}</td></tr>`;
  }
}

async function loadProducts() {
  productsBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
  try {
    const products = await api('/api/admin/products');
    if (!products.length) {
      productsBody.innerHTML = '<tr><td colspan="6">No products found.</td></tr>';
      return;
    }
    productsBody.innerHTML = products
      .map(
        (product) => `
        <tr data-id="${product.id}">
          <td>${product.id}</td>
          <td>${product.name || ''}</td>
          <td><input class="row-input" type="number" step="0.01" value="${product.priceUSD}" data-field="priceUSD" /></td>
          <td><input class="row-input" type="number" step="1" value="${product.priceINR}" data-field="priceINR" /></td>
          <td><button class="btn ghost" data-action="save-product">Save</button></td>
          <td><button class="btn ghost" data-action="delete-product">Delete</button></td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    productsBody.innerHTML = `<tr><td colspan="6">${err.message}</td></tr>`;
  }
}

async function loadMemberships() {
  membershipsBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  try {
    const memberships = await api('/api/admin/memberships');
    if (!memberships.length) {
      membershipsBody.innerHTML = '<tr><td colspan="5">No memberships found.</td></tr>';
      return;
    }
    membershipsBody.innerHTML = memberships
      .map(
        (membership) => `
        <tr data-id="${membership.id}">
          <td>${membership.id}</td>
          <td>${membership.name || ''}</td>
          <td><input class="row-input" type="number" step="1" value="${membership.priceINR}" data-field="priceINR" /></td>
          <td><input class="row-input link" type="url" value="${membership.videoLink || ''}" data-field="videoLink" /></td>
          <td><button class="btn ghost" data-action="save-membership">Save</button></td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    membershipsBody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

productsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const row = button.closest('tr');
  const id = row.dataset.id;

  if (button.dataset.action === 'save-product') {
    const priceUSD = row.querySelector('[data-field="priceUSD"]').value;
    const priceINR = row.querySelector('[data-field="priceINR"]').value;
    button.textContent = 'Saving...';
    try {
      await api(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ priceUSD, priceINR })
      });
      button.textContent = 'Saved';
      setTimeout(() => {
        button.textContent = 'Save';
      }, 1200);
    } catch (err) {
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = 'Save';
      }, 1400);
    }
  } else if (button.dataset.action === 'delete-product') {
    if (!confirm('Are you sure you want to delete this product?')) return;
    button.textContent = 'Deleting...';
    try {
      await api(`/api/admin/products/${id}`, { method: 'DELETE' });
      await loadProducts();
    } catch (err) {
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = 'Delete';
      }, 1400);
    }
  }
});

usersBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const row = button.closest('tr');
  const id = row.dataset.id;

  if (button.dataset.action === 'save-user') {
    const name = row.querySelector('[data-field="name"]').value.trim();
    const email = row.querySelector('[data-field="email"]').value.trim();
    const address = row.querySelector('[data-field="address"]').value.trim();
    const gender = row.querySelector('[data-field="gender"]').value.trim();
    const hobbies = row.querySelector('[data-field="hobbies"]').value.trim();
    button.textContent = 'Saving...';
    try {
      await api(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, email, address, gender, hobbies })
      });
      button.textContent = 'Saved';
      setTimeout(() => {
        button.textContent = 'Save';
      }, 1200);
    } catch (err) {
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = 'Save';
      }, 1400);
    }
  } else if (button.dataset.action === 'delete-user') {
    if (!confirm('Are you sure you want to delete this user?')) return;
    button.textContent = 'Deleting...';
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err) {
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = 'Delete';
      }, 1400);
    }
  }
});

membershipsBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button || button.dataset.action !== 'save-membership') return;
  const row = button.closest('tr');
  const id = row.dataset.id;
  const priceINR = row.querySelector('[data-field="priceINR"]').value;
  const videoLink = row.querySelector('[data-field="videoLink"]').value;
  button.textContent = 'Saving...';
  try {
    await api(`/api/admin/memberships/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ priceINR, videoLink })
    });
    button.textContent = 'Saved';
    setTimeout(() => {
      button.textContent = 'Save';
    }, 1200);
  } catch (err) {
    button.textContent = 'Error';
    setTimeout(() => {
      button.textContent = 'Save';
    }, 1400);
  }
});

videosBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const row = button.closest('tr');
  const id = row.dataset.id;
  if (button.dataset.action === 'save-video') {
    const title = row.querySelector('[data-field="title"]').value.trim();
    const category = row.querySelector('[data-field="category"]').value.trim();
    const url = row.querySelector('[data-field="url"]').value.trim();
    const thumbnail = row.querySelector('[data-field="thumbnail"]').value.trim();
    button.textContent = 'Saving...';
    try {
      await api(`/api/admin/videos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ title, category, url, thumbnail })
      });
      button.textContent = 'Saved';
      setTimeout(() => {
        button.textContent = 'Save';
      }, 1200);
    } catch (err) {
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = 'Save';
      }, 1400);
    }
    return;
  }
  if (button.dataset.action === 'delete-video') {
    button.textContent = 'Deleting...';
    try {
      await api(`/api/admin/videos/${id}`, { method: 'DELETE' });
      await loadVideos();
    } catch (err) {
      button.textContent = 'Error';
      setTimeout(() => {
        button.textContent = 'Delete';
      }, 1400);
    }
  }
});

videoForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  videoStatus.textContent = '';
  const formData = new FormData(videoForm);
  const payload = {
    title: String(formData.get('title') || '').trim(),
    category: String(formData.get('category') || '').trim(),
    url: String(formData.get('url') || '').trim(),
    thumbnail: String(formData.get('thumbnail') || '').trim()
  };
  try {
    await api('/api/admin/videos', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    videoForm.reset();
    await loadVideos();
  } catch (err) {
    videoStatus.textContent = err.message;
  }
});

const productForm = document.getElementById('productForm');
const productStatus = document.getElementById('productStatus');

productForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  productStatus.textContent = '';
  const formData = new FormData(productForm);
  const payload = {
    name: String(formData.get('name') || '').trim(),
    priceUSD: Number(formData.get('priceUSD') || 0),
    priceINR: Number(formData.get('priceINR') || 0)
  };
  if (!payload.name || !payload.priceUSD || !payload.priceINR) {
    productStatus.textContent = 'All fields are required.';
    return;
  }
  try {
    await api('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    productForm.reset();
    await loadProducts();
  } catch (err) {
    productStatus.textContent = err.message;
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginStatus.textContent = '';
  const formData = new FormData(loginForm);
  const payload = {
    username: formData.get('username'),
    password: formData.get('password')
  };
  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    loginForm.reset();
    await checkAdmin();
  } catch (err) {
    loginStatus.textContent = err.message;
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await api('/api/admin/logout', { method: 'POST' });
  } catch (err) {
    // ignore
  }
  setVisible(false);
});

refreshUsers.addEventListener('click', loadUsers);
refreshProducts.addEventListener('click', loadProducts);
refreshMemberships.addEventListener('click', loadMemberships);
refreshVideos.addEventListener('click', loadVideos);

checkAdmin();
