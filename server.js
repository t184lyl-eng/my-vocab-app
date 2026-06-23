const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const Datastore = require('nedb-promises'); // 引入資料庫套件

const app = express();
app.use(express.json());
app.use(cors());

// 讓伺服器自動讀取 public 資料夾裡的網頁檔案
app.use(express.static('public'));

// 【已修正】改為純記憶體模式運作，防止 Render 免費伺服器因為寫入檔案而崩潰
const dbUsers = Datastore.create({ inMemoryOnly: true });
const dbWords = Datastore.create({ inMemoryOnly: true });

// 1. 用戶註冊 API
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    // 從記憶體資料庫尋找是否已有同名用戶
    const existingUser = await dbUsers.findOne({ username });
    if (existingUser) {
        return res.status(400).json({ message: '用戶名已被註冊！' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // 將新用戶寫入資料庫
    await dbUsers.insert({ username, passwordHash });
    res.json({ message: '註冊成功！可以登入了。' });
});

// 2. 用戶登入 API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    // 從資料庫尋找用戶
    const user = await dbUsers.findOne({ username });
    if (!user) {
        return res.status(400).json({ message: '找不到此用戶！' });
    }

    // 比對密碼
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        return res.status(400).json({ message: '密碼錯誤！' });
    }

    res.json({ message: '登入成功！', username: user.username });
});

// 3. 新增生字 API
app.post('/api/words', async (req, res) => {
    const { username, word, meaning } = req.body;
    if (!username) return res.status(401).json({ message: '請先登入！' });

    // 將生字寫入資料庫
    await dbWords.insert({ username, word, meaning });
    res.json({ message: '生字新增成功！' });
});

// 4. 獲取用戶生字列表 API
app.get('/api/words/:username', async (req, res) => {
    // 從資料庫撈出屬於該用戶的生字
    const userWords = await dbWords.find({ username: req.params.username });
    res.json(userWords);
});

// 使用環境變數的 Port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器正在運行中...`);
});