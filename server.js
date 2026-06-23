const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Resend } = require('resend'); // 引入寄信套件

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 【已嵌入】你專屬的 Resend 寄信 API Key
const resend = new Resend('re_SWiiEzsS_ADceDfw7dwoZ5bD7pJDuXAhr');

// 記憶體儲存，用戶資料包含 username, passwordHash, email
const dbUsers = [];
const dbWords = [];

const SECRET_SALT = 'my-super-secret-salt';

function hashPassword(password) {
    return crypto.createHmac('sha256', SECRET_SALT).update(password).digest('hex');
}

// 1. 用戶註冊 API（新增：綁定 Email、寄送歡迎信）
app.post('/api/register', async (req, res) => {
    const { username, password, email } = req.body;
    
    if (!email) return res.status(400).json({ message: '請輸入電子郵件！' });

    const existingUser = dbUsers.find(u => u.username === username);
    if (existingUser) return res.status(400).json({ message: '用戶名已被註冊！' });

    const existingEmail = dbUsers.find(u => u.email === email);
    if (existingEmail) return res.status(400).json({ message: '此電子郵件已被其他帳號使用！' });

    const passwordHash = hashPassword(password);
    dbUsers.push({ username, passwordHash, email });

    // 寄送註冊成功通知信
    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev', // Resend 免費測試域名
            to: email,
            subject: '🎉 歡迎加入生字簿 App！註冊成功通知',
            html: `<p>嗨 ${username}，</p><p>恭喜你成功註冊生字簿 App！現在你可以開始記錄你的專屬單字，提升英文能力囉！</p>`
        });
    } catch (error) {
        console.log('郵件寄送失敗，但帳號已註冊成功。', error);
    }

    res.json({ message: '註冊成功！已發送通知信至您的 Email。' });
});

// 2. 尋找密碼 API（生成隨機新臨時密碼並寄信）
app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: '請輸入電子郵件！' });

    const user = dbUsers.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: '找不到綁定此電子郵件的用戶！' });

    // 隨機生成一個 8 位數的臨時新密碼
    const tempPassword = crypto.randomBytes(4).toString('hex');
    
    // 更新該用戶的加密密碼
    user.passwordHash = hashPassword(tempPassword);

    // 寄送新密碼信件
    try {
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: '🔒 生字簿 App - 密碼重置通知',
            html: `<p>您的帳戶：<b>${user.username}</b> 填寫了忘記密碼申請。</p>
                   <p>系統已為您重置了臨時密碼：<h2 style="color: #2563eb;">${tempPassword}</h2></p>
                   <p>請使用此臨時密碼登入，並盡快於登入後更換密碼。</p>`
        });
        res.json({ message: '臨時密碼已成功寄出，請檢查您的電子信箱！' });
    } catch (error) {
        res.status(500).json({ message: '郵件發送失敗，請稍後再試。' });
    }
});

// 3. 用戶登入 API
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = dbUsers.find(u => u.username === username);
    if (!user) return res.status(400).json({ message: '找不到此用戶！' });

    const passwordHash = hashPassword(password);
    if (passwordHash !== user.passwordHash) return res.status(400).json({ message: '密碼錯誤！' });

    res.json({ message: '登入成功！', username: user.username });
});

// 4. 新增生字 API
app.post('/api/words', async (req, res) => {
    const { username, word, meaning } = req.body;
    if (!username) return res.status(401).json({ message: '請先登入！' });
    dbWords.push({ username, word, meaning });
    res.json({ message: '生字新增成功！' });
});

// 5. 獲取用戶生字列表 API
app.get('/api/words/:username', async (req, res) => {
    const userWords = dbWords.filter(w => w.username === req.params.username);
    res.json(userWords);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器正在運行中...`);
});