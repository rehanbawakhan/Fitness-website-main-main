const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const con = require('./db_conn.js'); // Your database connection module
require('dotenv').config();

const app = express();
const publicpath = path.join(__dirname, 'public');
const sessions = new Map();
const dataDir = path.join(__dirname, 'data');
const productsFile = path.join(dataDir, 'products.json');
const membershipsFile = path.join(dataDir, 'memberships.json');
const videosFile = path.join(dataDir, 'videos.json');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

function parseCookies(req) {
    const raw = req.headers.cookie || '';
    const cookies = {};
    raw.split(';').forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx > -1) {
            const key = pair.slice(0, idx).trim();
            const value = decodeURIComponent(pair.slice(idx + 1).trim());
            cookies[key] = value;
        }
    });
    return cookies;
}

function getSession(req) {
    const cookies = parseCookies(req);
    const sid = cookies.sid;
    if (!sid) return null;
    return sessions.get(sid) || null;
}

function getSessionUserId(req) {
    const session = getSession(req);
    if (!session) return null;
    if (typeof session === 'object') return session.userId || null;
    return session;
}

function isAdminSession(req) {
    const session = getSession(req);
    if (!session || typeof session !== 'object') return false;
    return Boolean(session.isAdmin);
}

function createSession(res, userId) {
    const sid = crypto.randomUUID();
    sessions.set(sid, { userId, isAdmin: false });
    res.setHeader(
        'Set-Cookie',
        `sid=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax`
    );
}

function createAdminSession(res) {
    const sid = crypto.randomUUID();
    sessions.set(sid, { userId: null, isAdmin: true });
    res.setHeader(
        'Set-Cookie',
        `sid=${encodeURIComponent(sid)}; HttpOnly; Path=/; SameSite=Lax`
    );
}

function clearSession(req, res) {
    const cookies = parseCookies(req);
    if (cookies.sid) sessions.delete(cookies.sid);
    res.setHeader(
        'Set-Cookie',
        'sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'
    );
}

function readJsonFile(filePath, fallback) {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        if (err.code === 'ENOENT') {
            if (fallback !== undefined) {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
                return fallback;
            }
        }
        throw err;
    }
}

function writeJsonFile(filePath, data) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readProducts() {
    return readJsonFile(productsFile, []);
}

function readMemberships() {
    return readJsonFile(membershipsFile, []);
}

function readVideos() {
    return readJsonFile(videosFile, []);
}

function requireAdmin(req, res, next) {
    if (!isAdminSession(req)) {
        return res.status(401).json({ error: 'Admin not authenticated' });
    }
    return next();
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(publicpath)); // Serve static files (CSS, JS, images, etc.)

// Routes
app.get('/Home', (req, res) => {
    res.sendFile(path.join(publicpath, 'home.html'));
});

app.get('/Login', (req, res) => {
    res.sendFile(path.join(publicpath, 'login.html'));
});

app.get('/Registration', (req, res) => {
    res.sendFile(path.join(publicpath, 'registration.html'));
});

// Registration Validation
app.post('/RegistrationValidation', (req, res) => {
    const { name, email, psw: password, cpass, address, gender } = req.body;
    const hobbies = Array.isArray(req.body.hobbies)
        ? req.body.hobbies.join(',')
        : req.body.hobbies;

    // Check if passwords match
    if (password !== cpass) {
        return res.status(400).send('Passwords do not match');
    }

    // Hash password before saving
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Hashing error:', err);
            return res.status(500).send('Encryption error');
        }

        const sql =
            'INSERT INTO user (name, email, password, address, gender, hobbies) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [name, email, hashedPassword, address, gender, hobbies];

        con.query(sql, values, (err, result) => {
            if (err) {
                console.error('Error executing query:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).send('Email already registered');
                }
                return res.status(500).send('Database error');
            }
            console.log('Data inserted successfully:', result);
            res.redirect('/Home');
        });
    });
});

// Login Validation
app.post('/LoginValidation', (req, res) => {
    const uname = req.body.username;
    const pass = req.body.password;

    const sql = 'SELECT * FROM user WHERE email = ? OR name = ? LIMIT 1';
    con.query(sql, [uname, uname], function (err, result) {
        if (err) {
            console.error('Login error:', err);
            return res.status(500).send(`Database error (${err.code || 'unknown'})`);
        }

        if (result.length === 0) {
            return res.status(401).send('Invalid email or password');
        }

        const storedHash = result[0].password;
        const userId = result[0].id;
        // Support bcrypt hashes and legacy plain-text passwords.
        if (!storedHash || !storedHash.startsWith('$2')) {
            if (pass === storedHash) {
                // Update last login timestamp for plain-text passwords
                const updateLoginSql = 'UPDATE user SET lastLogin = NOW() WHERE id = ?';
                con.query(updateLoginSql, [userId], (updateErr) => {
                    if (updateErr) console.error('Update lastLogin error:', updateErr);
                    createSession(res, userId);
                    res.redirect('/dashboard.html');
                });
            } else {
                return res.status(401).send('Invalid email or password');
            }
            return;
        }

        bcrypt.compare(pass, storedHash, function (err, isMatch) {
            if (err) {
                console.error('Compare error:', err);
                return res.status(500).send('Encryption error');
            }
            if (isMatch) {
                // Update last login timestamp
                const updateLoginSql = 'UPDATE user SET lastLogin = NOW() WHERE id = ?';
                con.query(updateLoginSql, [userId], (updateErr) => {
                    if (updateErr) console.error('Update lastLogin error:', updateErr);
                    createSession(res, userId);
                    res.redirect('/dashboard.html');
                });
            } else {
                res.status(401).send('Invalid email or password');
            }
        });
    });
});

app.get('/api/me', (req, res) => {
    const userId = getSessionUserId(req);
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const sql = 'SELECT id, name, email, address, gender, hobbies FROM user WHERE id = ? LIMIT 1';
    con.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('api/me error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!result.length) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json(result[0]);
    });
});

app.put('/api/me', (req, res) => {
    const userId = getSessionUserId(req);
    if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const name = String(req.body.name || '').trim();
    const address = String(req.body.address || '').trim();
    if (!name) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const sql = 'UPDATE user SET name = ?, address = ? WHERE id = ?';
    con.query(sql, [name, address, userId], (err) => {
        if (err) {
            console.error('api/me update error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        return res.json({ ok: true });
    });
});

// Public data endpoints
app.get('/api/products', (req, res) => {
    try {
        const products = readProducts();
        return res.json(products);
    } catch (err) {
        console.error('api/products error:', err);
        return res.status(500).json({ error: 'Failed to load products' });
    }
});

app.get('/api/memberships', (req, res) => {
    try {
        const memberships = readMemberships();
        return res.json(memberships);
    } catch (err) {
        console.error('api/memberships error:', err);
        return res.status(500).json({ error: 'Failed to load memberships' });
    }
});

app.get('/api/videos', (req, res) => {
    try {
        const videos = readVideos();
        return res.json(videos);
    } catch (err) {
        console.error('api/videos error:', err);
        return res.status(500).json({ error: 'Failed to load videos' });
    }
});

// Admin auth
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body || {};
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        createAdminSession(res);
        return res.json({ ok: true });
    }
    return res.status(401).json({ error: 'Invalid admin credentials' });
});

app.post('/api/admin/logout', (req, res) => {
    clearSession(req, res);
    return res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
    if (!isAdminSession(req)) {
        return res.status(401).json({ error: 'Admin not authenticated' });
    }
    return res.json({ ok: true });
});

// Admin data endpoints
app.get('/api/admin/users', requireAdmin, (req, res) => {
    const sql = 'SELECT id, name, email, address, gender, hobbies, DATE_FORMAT(lastLogin, "%Y-%m-%d %H:%i:%s") as lastLogin FROM user ORDER BY id DESC';
    con.query(sql, (err, result) => {
        if (err) {
            console.error('api/admin/users error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        return res.json(result || []);
    });
});

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const address = String(req.body.address || '').trim();
    const gender = String(req.body.gender || '').trim();
    const hobbies = String(req.body.hobbies || '').trim();
    if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }
    const sql =
        'UPDATE user SET name = ?, email = ?, address = ?, gender = ?, hobbies = ? WHERE id = ?';
    con.query(sql, [name, email, address, gender, hobbies, id], (err, result) => {
        if (err) {
            console.error('api/admin/users update error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ ok: true });
    });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }
    const sql = 'DELETE FROM user WHERE id = ?';
    con.query(sql, [id], (err, result) => {
        if (err) {
            console.error('api/admin/users delete error:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!result.affectedRows) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json({ ok: true });
    });
});

app.get('/api/admin/products', requireAdmin, (req, res) => {
    try {
        return res.json(readProducts());
    } catch (err) {
        console.error('api/admin/products error:', err);
        return res.status(500).json({ error: 'Failed to load products' });
    }
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const priceUSD = Number(req.body.priceUSD);
        const priceINR = Number(req.body.priceINR);
        if (!name || !Number.isFinite(priceUSD) || !Number.isFinite(priceINR)) {
            return res.status(400).json({ error: 'Name and prices are required' });
        }
        const products = readProducts();
        const nextId = products.length ? Math.max(...products.map((p) => Number(p.id) || 0)) + 1 : 1;
        const product = { id: nextId, name, priceUSD, priceINR };
        products.push(product);
        writeJsonFile(productsFile, products);
        return res.json({ ok: true, product });
    } catch (err) {
        console.error('api/admin/products create error:', err);
        return res.status(500).json({ error: 'Failed to create product' });
    }
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);
        const priceUSD = Number(req.body.priceUSD);
        const priceINR = Number(req.body.priceINR);
        if (!Number.isFinite(id) || !Number.isFinite(priceUSD) || !Number.isFinite(priceINR)) {
            return res.status(400).json({ error: 'Invalid product update payload' });
        }
        const products = readProducts();
        const idx = products.findIndex((p) => Number(p.id) === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        products[idx].priceUSD = priceUSD;
        products[idx].priceINR = priceINR;
        writeJsonFile(productsFile, products);
        return res.json({ ok: true, product: products[idx] });
    } catch (err) {
        console.error('api/admin/products update error:', err);
        return res.status(500).json({ error: 'Failed to update product' });
    }
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid product id' });
        }
        const products = readProducts();
        const next = products.filter((p) => Number(p.id) !== id);
        if (next.length === products.length) {
            return res.status(404).json({ error: 'Product not found' });
        }
        writeJsonFile(productsFile, next);
        return res.json({ ok: true });
    } catch (err) {
        console.error('api/admin/products delete error:', err);
        return res.status(500).json({ error: 'Failed to delete product' });
    }
});

app.get('/api/admin/memberships', requireAdmin, (req, res) => {
    try {
        return res.json(readMemberships());
    } catch (err) {
        console.error('api/admin/memberships error:', err);
        return res.status(500).json({ error: 'Failed to load memberships' });
    }
});

app.put('/api/admin/memberships/:id', requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);
        const priceINR = Number(req.body.priceINR);
        const videoLink = String(req.body.videoLink || '').trim();
        if (!Number.isFinite(id) || !Number.isFinite(priceINR)) {
            return res.status(400).json({ error: 'Invalid membership update payload' });
        }
        const memberships = readMemberships();
        const idx = memberships.findIndex((m) => Number(m.id) === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Membership not found' });
        }
        memberships[idx].priceINR = priceINR;
        memberships[idx].videoLink = videoLink;
        writeJsonFile(membershipsFile, memberships);
        return res.json({ ok: true, membership: memberships[idx] });
    } catch (err) {
        console.error('api/admin/memberships update error:', err);
        return res.status(500).json({ error: 'Failed to update membership' });
    }
});

app.get('/api/admin/videos', requireAdmin, (req, res) => {
    try {
        return res.json(readVideos());
    } catch (err) {
        console.error('api/admin/videos error:', err);
        return res.status(500).json({ error: 'Failed to load videos' });
    }
});

app.post('/api/admin/videos', requireAdmin, (req, res) => {
    try {
        const title = String(req.body.title || '').trim();
        const category = String(req.body.category || '').trim();
        const url = String(req.body.url || '').trim();
        const thumbnail = String(req.body.thumbnail || '').trim();
        if (!title || !url) {
            return res.status(400).json({ error: 'Title and URL are required' });
        }
        const videos = readVideos();
        const nextId = videos.length ? Math.max(...videos.map((v) => Number(v.id) || 0)) + 1 : 1;
        const video = { id: nextId, title, category, url, thumbnail };
        videos.push(video);
        writeJsonFile(videosFile, videos);
        return res.json({ ok: true, video });
    } catch (err) {
        console.error('api/admin/videos create error:', err);
        return res.status(500).json({ error: 'Failed to create video' });
    }
});

app.put('/api/admin/videos/:id', requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);
        const title = String(req.body.title || '').trim();
        const category = String(req.body.category || '').trim();
        const url = String(req.body.url || '').trim();
        const thumbnail = String(req.body.thumbnail || '').trim();
        if (!Number.isFinite(id) || !title || !url) {
            return res.status(400).json({ error: 'Invalid video update payload' });
        }
        const videos = readVideos();
        const idx = videos.findIndex((v) => Number(v.id) === id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Video not found' });
        }
        videos[idx] = { ...videos[idx], title, category, url, thumbnail };
        writeJsonFile(videosFile, videos);
        return res.json({ ok: true, video: videos[idx] });
    } catch (err) {
        console.error('api/admin/videos update error:', err);
        return res.status(500).json({ error: 'Failed to update video' });
    }
});

app.delete('/api/admin/videos/:id', requireAdmin, (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ error: 'Invalid video id' });
        }
        const videos = readVideos();
        const next = videos.filter((v) => Number(v.id) !== id);
        if (next.length === videos.length) {
            return res.status(404).json({ error: 'Video not found' });
        }
        writeJsonFile(videosFile, next);
        return res.json({ ok: true });
    } catch (err) {
        console.error('api/admin/videos delete error:', err);
        return res.status(500).json({ error: 'Failed to delete video' });
    }
});

app.get('/Logout', (req, res) => {
    clearSession(req, res);
    res.redirect('/login.html');
});

// Groq chat proxy (keeps API key on server)
app.post('/api/groq-chat', async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY) {
            return res.status(500).json({
                error: { message: 'Server missing GROQ_API_KEY in .env' }
            });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        return res.json(data);
    } catch (error) {
        console.error('Groq proxy error:', error);
        return res.status(500).json({
            error: { message: 'Groq proxy request failed' }
        });
    }
});

// Fallback route for unmatched paths (Express 5)
app.use((req, res) => {
    res.sendFile(path.join(publicpath, 'pagenotfound.html'));
});

// Start the server
app.listen(6800, () => {
    console.log('✅ Server is running on port 6800');
});

