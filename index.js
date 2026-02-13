const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const con = require('./db_conn.js'); // Your database connection module
require('dotenv').config();

const app = express();
const publicpath = path.join(__dirname, 'public');
const sessions = new Map();

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

function getSessionUserId(req) {
    const cookies = parseCookies(req);
    const sid = cookies.sid;
    if (!sid) return null;
    return sessions.get(sid) || null;
}

function createSession(res, userId) {
    const sid = crypto.randomUUID();
    sessions.set(sid, userId);
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
                createSession(res, userId);
                return res.redirect('/dashboard.html');
            }
            return res.status(401).send('Invalid email or password');
        }

        bcrypt.compare(pass, storedHash, function (err, isMatch) {
            if (err) {
                console.error('Compare error:', err);
                return res.status(500).send('Encryption error');
            }
            if (isMatch) {
                createSession(res, userId);
                res.redirect('/dashboard.html');
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

