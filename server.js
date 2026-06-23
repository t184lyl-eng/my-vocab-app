const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 原生記憶體儲存，100% 免套件，保證在 Render 上順利運行不崩潰
const dbUsers = [];
const dbWords = [];

const SECRET_SALT = 'my-super-secret-salt';

function hashPassword(password) {
    return crypto.createHmac('sha256', SECRET_SALT).update(password).digest('hex');
}

// 1. 用戶註冊 API
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    const existingUser = dbUsers.find(u => u.username === username);
    if (existingUser) {
        return res.status(400).json({ message: '用戶名已被註冊！' });
    }

    const passwordHash = hashPassword(password);
    dbUsers.push({ username, passwordHash });
    res.json({ message: '註冊成功！可以登入了。' });
});

// 2. 用戶登入 API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    const user = dbUsers.find(u => u.username === username);
    if (!user) {
        return res.status(400).json({ message: '找不到此用戶！' });
    }

    const passwordHash = hashPassword(password);
    if (passwordHash !== user.passwordHash) {
        return res.status(400).json({ message: '密碼錯誤！' });
    }

    res.json({ message: '登入成功！', username: user.username });
});

// 3. 新增生字 API
app.post('/api/words', async (req, res) => {
    const { username, word, meaning } = req.body;
    if (!username) return res.status(401).json({ message: '請先登入！' });

    dbWords.push({ username, word, meaning });
    res.json({ message: '生字新增成功！' });
});

// 4. 獲取用戶生字列表 API
app.get('/api/words/:username', async (req, res) => {
    const userWords = dbWords.filter(w => w.username === req.params.username);
    res.json(userWords);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器正在運行中...`);
});