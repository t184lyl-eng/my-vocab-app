const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

// 讓伺服器自動讀取 public 資料夾裡的網頁檔案
app.use(express.static('public'));

const users = []; 
const vocabularies = []; 

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: '用戶名已被註冊！' });
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    users.push({ username, passwordHash });
    res.json({ message: '註冊成功！可以登入了。' });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) return res.status(400).json({ message: '找不到此用戶！' });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ message: '密碼錯誤！' });
    res.json({ message: '登入成功！', username: user.username });
});

app.post('/api/words', (req, res) => {
    const { username, word, meaning } = req.body;
    if (!username) return res.status(401).json({ message: '請先登入！' });
    vocabularies.push({ username, word, meaning });
    res.json({ message: '生字新增成功！' });
});

app.get('/api/words/:username', (req, res) => {
    const userWords = vocabularies.filter(v => v.username === req.params.username);
    res.json(userWords);
});

// 使用環境變數的 Port，這在線上伺服器是必須的
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器正在運行中...`);
});