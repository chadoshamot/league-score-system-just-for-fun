// 全局变量
let currentUser = null;
let isAdmin = false;
let currentRound = 1;
let predictions = {};
let matchResults = {};
let users = {};
let leaderboard = [];
let history = {};
let deadlines = {}; // 存储每轮的预测截止时间
let scheduledMatches = {}; // 存储每轮的预设比赛对阵

// 管理员密码（你可以修改这个密码）
const ADMIN_PASSWORD = "admin123";

// GitHub Gist 配置（用于跨设备数据同步）
const GIST_CONFIG = {
    // 你需要创建一个GitHub Personal Access Token，并在这里填入
    // 访问 https://github.com/settings/tokens 创建token
    // 需要勾选 gist 权限
    token: '', // 请填入你的GitHub Personal Access Token
    
    // Gist ID，第一次使用时会自动创建
    gistId: localStorage.getItem('leagueScoreGistId') || '',
    
    // 文件名
    filename: 'league-score-data.json'
};

// GitHub Gist API 函数
async function saveDataToGist() {
    if (!GIST_CONFIG.token) {
        // 如果没有配置token，回退到localStorage
        saveDataToLocal();
        return;
    }
    
    try {
        const data = {
            users,
            predictions,
            matchResults,
            leaderboard,
            history,
            currentRound,
            deadlines,
            scheduledMatches
        };
        
        const gistData = {
            description: 'League Score System Data',
            public: false,
            files: {
                [GIST_CONFIG.filename]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };
        
        const url = GIST_CONFIG.gistId 
            ? `https://api.github.com/gists/${GIST_CONFIG.gistId}`
            : 'https://api.github.com/gists';
        
        const method = GIST_CONFIG.gistId ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `token ${GIST_CONFIG.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(gistData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (!GIST_CONFIG.gistId) {
                // 第一次创建，保存gist ID
                GIST_CONFIG.gistId = result.id;
                localStorage.setItem('leagueScoreGistId', result.id);
            }
            console.log('数据已保存到GitHub Gist');
        } else {
            console.error('保存到GitHub Gist失败:', response.statusText);
            // 回退到localStorage
            saveDataToLocal();
        }
    } catch (error) {
        console.error('保存到GitHub Gist出错:', error);
        // 回退到localStorage
        saveDataToLocal();
    }
}

async function loadDataFromGist() {
    if (!GIST_CONFIG.token || !GIST_CONFIG.gistId) {
        // 如果没有配置token或gist ID，从localStorage加载
        loadDataFromLocal();
        return;
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            headers: {
                'Authorization': `token ${GIST_CONFIG.token}`,
            }
        });
        
        if (response.ok) {
            const gist = await response.json();
            const file = gist.files[GIST_CONFIG.filename];
            
            if (file && file.content) {
                const data = JSON.parse(file.content);
                users = data.users || {};
                predictions = data.predictions || {};
                matchResults = data.matchResults || {};
                leaderboard = data.leaderboard || [];
                history = data.history || {};
                currentRound = data.currentRound || 1;
                deadlines = data.deadlines || {};
                scheduledMatches = data.scheduledMatches || {};
                
                // 确保scheduledMatches[currentRound]存在
                if (!scheduledMatches[currentRound]) {
                    scheduledMatches[currentRound] = [];
                }
                
                console.log('数据已从GitHub Gist加载');
            } else {
                console.log('GitHub Gist中没有找到数据文件，使用默认数据');
                loadDataFromLocal();
            }
        } else {
            console.error('从GitHub Gist加载失败:', response.statusText);
            loadDataFromLocal();
        }
    } catch (error) {
        console.error('从GitHub Gist加载出错:', error);
        loadDataFromLocal();
    }
}

// 原有的localStorage函数（作为备用）
function saveDataToLocal() {
    localStorage.setItem('leagueScoreData', JSON.stringify({
        users,
        predictions,
        matchResults,
        leaderboard,
        history,
        currentRound,
        deadlines,
        scheduledMatches
    }));
}

function loadDataFromLocal() {
    const data = localStorage.getItem('leagueScoreData');
    if (data) {
        try {
            const parsed = JSON.parse(data);
            users = parsed.users || {};
            predictions = parsed.predictions || {};
            matchResults = parsed.matchResults || {};
            leaderboard = parsed.leaderboard || [];
            history = parsed.history || {};
            currentRound = parsed.currentRound || 1;
            deadlines = parsed.deadlines || {};
            scheduledMatches = parsed.scheduledMatches || {};
            
            // 确保scheduledMatches[currentRound]存在
            if (!scheduledMatches[currentRound]) {
                scheduledMatches[currentRound] = [];
            }
        } catch (error) {
            console.error('数据加载失败:', error);
            // 如果数据损坏，重置为默认值
            users = {};
            predictions = {};
            matchResults = {};
            leaderboard = [];
            history = {};
            currentRound = 1;
            deadlines = {};
            scheduledMatches = {};
        }
    }
    
    // 如果没有用户，创建默认管理员账户
    if (Object.keys(users).length === 0) {
        users['admin'] = {
            password: ADMIN_PASSWORD,
            isAdmin: true,
            joinDate: new Date().toISOString()
        };
        saveData();
    }
}

// 统一的保存和加载函数
async function saveData() {
    await saveDataToGist();
}

async function loadData() {
    await loadDataFromGist();
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 先加载保存的token
    loadSavedToken();
    
    // 然后加载数据
    await loadData();
    showLogin();
    
    // 确保数据加载完成后界面正确显示
    setTimeout(() => {
        if (currentUser && isAdmin) {
            updateAdminInterface();
        } else if (currentUser) {
            updateMainInterface();
        }
    }, 100);
});

// 界面切换函数
function showLogin() {
    hideAllSections();
    document.getElementById('loginSection').classList.remove('hidden');
}

function showRegister() {
    hideAllSections();
    document.getElementById('registerSection').classList.remove('hidden');
}

function showMainSection() {
    hideAllSections();
    document.getElementById('mainSection').classList.remove('hidden');
    updateMainInterface();
}

function showAdminPanel() {
    hideAllSections();
    document.getElementById('adminSection').classList.remove('hidden');
    
    // 确保用户列表是最新的
    updateAdminInterface();
    
    // 额外确保用户列表更新
    setTimeout(() => {
        updateUserList();
        updateUserStats();
        
        // 调试信息：在控制台显示当前用户数量
        console.log('当前用户总数:', Object.keys(users).length);
        console.log('用户列表:', Object.keys(users));
    }, 50);
}

function hideAllSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.add('hidden'));
}

// 用户认证
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    if (users[username] && users[username].password === password) {
        currentUser = username;
        isAdmin = users[username].isAdmin;
        
        // 如果是管理员登录，确保用户列表是最新的
        if (isAdmin) {
            // 先尝试从云端同步最新数据
            if (GIST_CONFIG.token && GIST_CONFIG.gistId) {
                try {
                    await loadDataFromGist();
                    console.log('管理员登录后已从云端同步最新数据');
                } catch (error) {
                    console.error('同步失败:', error);
                }
            }
            
            // 延迟一下确保界面完全加载后再更新
            setTimeout(() => {
                updateAdminInterface();
            }, 100);
        }
        
        showMainSection();
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } else {
        alert('用户名或密码错误');
    }
}

async function register() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!username || !password || !confirmPassword) {
        alert('请填写所有字段');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('两次输入的密码不一致');
        return;
    }
    
    if (users[username]) {
        alert('用户名已存在');
        return;
    }
    
    // 创建新用户
    users[username] = {
        password: password,
        isAdmin: false,
        joinDate: new Date().toISOString()
    };
    
    // 初始化用户的预测数据
    if (!predictions[username]) {
        predictions[username] = {};
    }
    
    // 保存数据
    await saveData();
    
    // 强制同步到云端（确保新用户立即可见）
    if (GIST_CONFIG.token) {
        try {
            await saveDataToGist();
            console.log('新用户注册后数据已同步到云端');
        } catch (error) {
            console.error('同步失败:', error);
        }
    }
    
    // 如果当前有管理员登录，自动更新管理员界面
    if (currentUser && isAdmin) {
        updateAdminInterface();
    }
    
    // 清空输入框
    document.getElementById('regUsername').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
    
    alert('注册成功！');
    showLogin();
}

function logout() {
    currentUser = null;
    isAdmin = false;
    showLogin();
}

// 预测功能
async function addPrediction() {
    // 检查是否超过截止时间
    if (isDeadlineExpired(currentRound)) {
        alert('预测截止时间已过，无法添加或修改预测！');
        return;
    }
    
    // 检查是否已选择比赛
    if (!window.selectedMatch) {
        alert('请先选择要预测的比赛');
        return;
    }
    
    const { team1, team2 } = window.selectedMatch;
    const score1 = parseInt(document.getElementById('score1').value);
    const score2 = parseInt(document.getElementById('score2').value);
    
    if (isNaN(score1) || isNaN(score2)) {
        alert('请输入有效的比分');
        return;
    }
    
    const matchKey = `${team1}_${team2}`;
    
    if (!predictions[currentUser]) {
        predictions[currentUser] = {};
    }
    
    // 检查是否已存在预测，如果存在则更新
    const isUpdate = predictions[currentUser][matchKey] && predictions[currentUser][matchKey].round === currentRound;
    
    predictions[currentUser][matchKey] = {
        team1: team1,
        team2: team2,
        score1: score1,
        score2: score2,
        round: currentRound,
        timestamp: new Date().toISOString()
    };
    
    await saveData();
    
    // 清空输入框
    document.getElementById('score1').value = '';
    document.getElementById('score2').value = '';
    
    // 隐藏预测表单
    document.getElementById('predictionForm').classList.add('hidden');
    
    // 清除选中的比赛
    window.selectedMatch = null;
    
    // 恢复按钮状态
    const submitButton = document.querySelector('#predictionForm button');
    submitButton.textContent = '提交预测';
    submitButton.onclick = addPrediction;
    
    // 更新界面
    updateMainInterface();
    
    alert(isUpdate ? '预测修改成功！' : '预测添加成功！');
}

// 管理员功能
async function addMatchResult() {
    const team1 = document.getElementById('resultTeam1').value;
    const team2 = document.getElementById('resultTeam2').value;
    const score1 = parseInt(document.getElementById('resultScore1').value);
    const score2 = parseInt(document.getElementById('resultScore2').value);
    
    if (!team1 || !team2 || isNaN(score1) || isNaN(score2)) {
        alert('请填写完整的比赛结果');
        return;
    }
    
    const matchKey = `${team1}_${team2}`;
    matchResults[matchKey] = {
        team1: team1,
        team2: team2,
        score1: score1,
        score2: score2,
        round: currentRound,
        timestamp: new Date().toISOString()
    };
    
    await saveData();
    
    // 清空输入框
    document.getElementById('resultTeam1').value = '';
    document.getElementById('resultTeam2').value = '';
    document.getElementById('resultScore1').value = '';
    document.getElementById('resultScore2').value = '';
    
    // 更新界面
    updateAdminInterface();
    
    alert('比赛结果添加成功！');
}

// 修改比赛结果
async function editMatchResult(matchKey) {
    const result = matchResults[matchKey];
    if (!result) {
        alert('比赛结果不存在');
        return;
    }
    
    const newScore1 = prompt(`请输入${result.team1}的新得分:`, result.score1);
    const newScore2 = prompt(`请输入${result.team2}的新得分:`, result.score2);
    
    if (newScore1 === null || newScore2 === null) {
        return; // 用户取消
    }
    
    const score1 = parseInt(newScore1);
    const score2 = parseInt(newScore2);
    
    if (isNaN(score1) || isNaN(score2)) {
        alert('请输入有效的比分');
        return;
    }
    
    // 更新比分
    matchResults[matchKey].score1 = score1;
    matchResults[matchKey].score2 = score2;
    matchResults[matchKey].timestamp = new Date().toISOString();
    
    await saveData();
    updateAdminInterface();
    
    alert('比赛结果修改成功！');
}

function calculateScores() {
    // 检查是否有比赛结果
    if (Object.keys(matchResults).length === 0) {
        alert('请先添加比赛结果，无法计算得分！');
        return;
    }
    
    // 检查当前轮次是否有比赛结果
    const currentRoundResults = Object.values(matchResults).filter(result => result.round === currentRound);
    if (currentRoundResults.length === 0) {
        alert('当前轮次没有比赛结果，无法计算得分！');
        return;
    }
    
    // 检查当前轮次是否已经计算过
    if (history[currentRound]) {
        alert(`第${currentRound}轮已经计算过得分，不能重复计算！`);
        return;
    }
    
    // 检查是否有用户预测
    let hasPredictions = false;
    for (const username in predictions) {
        const userPredictions = predictions[username];
        for (const matchKey in userPredictions) {
            if (userPredictions[matchKey].round === currentRound) {
                hasPredictions = true;
                break;
            }
        }
        if (hasPredictions) break;
    }
    
    if (!hasPredictions) {
        alert('当前轮次没有用户预测，无法计算得分！');
        return;
    }
    
    // 计算每个用户的得分
    const roundScores = {};
    
    for (const username in predictions) {
        if (!roundScores[username]) {
            roundScores[username] = 0;
        }
        
        const userPredictions = predictions[username];
        for (const matchKey in userPredictions) {
            const prediction = userPredictions[matchKey];
            if (prediction.round === currentRound && matchResults[matchKey]) {
                const result = matchResults[matchKey];
                const score = calculateMatchScore(prediction, result);
                roundScores[username] += score;
            }
        }
    }
    
    // 检查是否有有效得分
    if (Object.keys(roundScores).length === 0) {
        alert('没有找到有效的预测和结果匹配，无法计算得分！');
        return;
    }
    
    // 更新排行榜
    for (const username in roundScores) {
        if (!leaderboard.find(item => item.username === username)) {
            leaderboard.push({
                username: username,
                totalScore: 0,
                rounds: []
            });
        }
        
        const leaderboardItem = leaderboard.find(item => item.username === username);
        
        // 移除该轮次的旧得分（如果存在）
        leaderboardItem.rounds = leaderboardItem.rounds.filter(r => r.round !== currentRound);
        
        // 添加新的得分
        leaderboardItem.rounds.push({
            round: currentRound,
            score: roundScores[username]
        });
        
        // 重新计算总分
        leaderboardItem.totalScore = leaderboardItem.rounds.reduce((sum, r) => sum + r.score, 0);
    }
    
    // 按总分排序
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    
    /*
    // 更新历史记录
    history[currentRound] = [];
    for (const username in roundScores) {
        const rank = leaderboard.findIndex(item => item.username === username) + 1;
        history[currentRound].push({
            username: username,
            score: roundScores[username],
            rank: rank
        });
    }
    */
    // 更新历史记录 - 修复排名计算逻辑
    history[currentRound] = [];
    
    // 按当前轮次得分排序，计算排名
    const roundRanking = Object.entries(roundScores)
        .map(([username, score]) => ({ username, score }))
        .sort((a, b) => b.score - a.score);
    
    // 更新历史记录，使用正确的排名
    roundRanking.forEach((item, index) => {
        history[currentRound].push({
            username: item.username,
            score: item.score,
            rank: index + 1  // 排名基于当前轮次得分
        });
    });
    
    // 历史记录按得分排序
    history[currentRound].sort((a, b) => b.score - a.score);
    
    // 进入下一轮
    currentRound++;
    
    saveData();
    
    // 更新所有界面
    updateAdminInterface();
    updateMainInterface();
    
    // 特别更新轮次选择器和单轮排行榜
    updateRoundSelector();
    updateRoundLeaderboard();
    
    alert(`第${currentRound - 1}轮得分计算完成！`);
}

// 计算单场比赛得分（完全按照League_old.cpp的逻辑）
function calculateMatchScore(prediction, result) {
    const predWinLose = prediction.score1 - prediction.score2;
    const resultWinLose = result.score1 - result.score2;
    
    // 检查胜负预测是否正确
    let winLoseCorrect = false;
    if (predWinLose > 0 && resultWinLose > 0) {
        winLoseCorrect = true; // 预测左队赢，结果左队赢
    } else if (predWinLose < 0 && resultWinLose < 0) {
        winLoseCorrect = true; // 预测左队输，结果左队输
    } else if (predWinLose === 0 && resultWinLose === 0) {
        winLoseCorrect = true; // 预测平局，结果平局
    }
    
    if (winLoseCorrect) {
        // 胜负预测正确
        if (prediction.score1 === result.score1 && prediction.score2 === result.score2) {
            return 5; // 完全正确，加5分
        } else if (predWinLose === resultWinLose) {
            return 3.5; // 净胜分正确，加3.5分
        } else if (prediction.score1 === result.score1 || prediction.score2 === result.score2) {
            return 3.5; // 部分比分正确，加3.5分
        } else {
            return 2; // 胜负正确但比分错误，加2分
        }
    } else {
        // 胜负预测错误
        if (prediction.score1 === result.score1 || prediction.score2 === result.score2) {
            return 1.5; // 部分比分正确，加1.5分
        } else {
            return 0; // 完全错误，加0分
        }
    }
}

// 用户管理功能
function searchUser() {
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();
    const userListContainer = document.getElementById('userListContainer');
    userListContainer.innerHTML = '';
    
    for (const username in users) {
        if (username.toLowerCase().includes(searchTerm)) {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-info">
                    <strong>${username}</strong>
                    <span>${users[username].isAdmin ? '(管理员)' : '(普通用户)'}</span>
                    <span>注册时间: ${new Date(users[username].joinDate).toLocaleDateString('zh-CN')}</span>
                </div>
                <div class="actions">
                    <button class="edit-btn" onclick="editUser('${username}')">编辑用户名</button>
                    <button class="edit-btn" onclick="editUserPassword('${username}')">修改密码</button>
                    <button class="edit-btn" onclick="toggleUserAdmin('${username}')">${users[username].isAdmin ? '降级' : '升级'}</button>
                    <button class="delete-btn" onclick="deleteUser('${username}')">删除</button>
                </div>
            `;
            userListContainer.appendChild(userItem);
        }
    }
}

function editUser(username) {
    const newUsername = prompt('请输入新的用户名:', username);
    if (newUsername && newUsername !== username) {
        if (users[newUsername]) {
            alert('用户名已存在');
            return;
        }
        
        if (newUsername.trim() === '') {
            alert('用户名不能为空');
            return;
        }
        
        const userData = users[username];
        delete users[username];
        users[newUsername] = userData;
        
        // 更新相关数据
        if (predictions[username]) {
            predictions[newUsername] = predictions[username];
            delete predictions[username];
        }
        
        // 更新排行榜
        const leaderboardItem = leaderboard.find(item => item.username === username);
        if (leaderboardItem) {
            leaderboardItem.username = newUsername;
        }
        
        // 更新历史记录
        for (const round in history) {
            const roundData = history[round];
            const userRoundData = roundData.find(item => item.username === username);
            if (userRoundData) {
                userRoundData.username = newUsername;
            }
        }
        
        // 如果修改的是当前登录用户，更新currentUser
        if (currentUser === username) {
            currentUser = newUsername;
        }
        
        saveData();
        alert('用户名修改成功！');
        updateAdminInterface();
        updateMainInterface();
    }
}

function editUserPassword(username) {
    const newPassword = prompt('请输入新密码:');
    if (newPassword && newPassword.trim() !== '') {
        users[username].password = newPassword;
        saveData();
        alert('密码修改成功！');
        updateAdminInterface();
    } else {
        alert('密码不能为空');
    }
}

function toggleUserAdmin(username) {
    if (username === 'admin') {
        alert('默认管理员账户不能修改权限！');
        return;
    }
    
    const currentStatus = users[username].isAdmin;
    const action = currentStatus ? '降级为普通用户' : '升级为管理员';
    
    if (confirm(`确定要${action} ${username} 吗？`)) {
        users[username].isAdmin = !currentStatus;
        saveData();
        alert(`${action}成功！`);
        updateAdminInterface();
    }
}

function deleteUser(username) {
    if (username === 'admin') {
        alert('不能删除管理员账户');
        return;
    }
    
    if (confirm(`确定要删除用户 ${username} 吗？这将删除该用户的所有预测数据和排行榜记录！`)) {
        // 删除用户账户
        delete users[username];
        
        // 删除用户的所有预测
        if (predictions[username]) {
            delete predictions[username];
        }
        
        // 从排行榜中移除
        leaderboard = leaderboard.filter(item => item.username !== username);
        
        // 从历史记录中移除
        for (const round in history) {
            history[round] = history[round].filter(item => item.username !== username);
        }
        
        // 如果删除的是当前登录用户，强制登出
        if (currentUser === username) {
            logout();
        }
        
        saveData();
        alert('用户删除成功！');
        updateAdminInterface();
    }
}

// 显示所有用户
function showAllUsers() {
    document.getElementById('searchUser').value = '';
    updateUserList();
}

// 更新用户统计信息
function updateUserStats() {
    const totalUsers = Object.keys(users).length;
    const adminUsers = Object.values(users).filter(user => user.isAdmin).length;
    const normalUsers = totalUsers - adminUsers;
    
    // 计算活跃用户（有预测记录的用户）
    const activeUsers = Object.keys(predictions).length;
    
    document.getElementById('totalUsersCount').textContent = totalUsers;
    document.getElementById('adminUsersCount').textContent = adminUsers;
    document.getElementById('normalUsersCount').textContent = normalUsers;
    document.getElementById('activeUsersCount').textContent = activeUsers;
}

// 增强的用户列表更新函数
function updateUserList() {
    const container = document.getElementById('userListContainer');
    container.innerHTML = '';
    
    const searchTerm = document.getElementById('searchUser').value.toLowerCase();
    let displayedUsers = 0;
    
    for (const username in users) {
        // 如果有搜索词，过滤用户
        if (searchTerm && !username.toLowerCase().includes(searchTerm)) {
            continue;
        }
        
        displayedUsers++;
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        // 获取用户统计信息
        const userPredictions = predictions[username] || {};
        const predictionCount = Object.keys(userPredictions).length;
        const userLeaderboard = leaderboard.find(item => item.username === username);
        const totalScore = userLeaderboard ? userLeaderboard.totalScore : 0;
        
        userItem.innerHTML = `
            <div class="user-info">
                <div class="user-basic">
                    <strong>${username}</strong>
                    <span class="user-role">${users[username].isAdmin ? '(管理员)' : '(普通用户)'}</span>
                </div>
                <div class="user-details">
                    <span>注册时间: ${new Date(users[username].joinDate).toLocaleDateString('zh-CN')}</span>
                    <span>预测次数: ${predictionCount}</span>
                    <span>总得分: ${totalScore}</span>
                </div>
            </div>
            <div class="actions">
                <button class="edit-btn" onclick="editUser('${username}')">编辑用户名</button>
                <button class="edit-btn" onclick="editUserPassword('${username}')">修改密码</button>
                <button class="edit-btn" onclick="toggleUserAdmin('${username}')">${users[username].isAdmin ? '降级' : '升级'}</button>
                <button class="delete-btn" onclick="deleteUser('${username}')">删除</button>
            </div>
        `;
        container.appendChild(userItem);
    }
    
    if (displayedUsers === 0) {
        container.innerHTML = '<p>没有找到匹配的用户</p>';
    }
    
    // 更新用户统计
    updateUserStats();
    
    // 调试信息
    console.log('updateUserList 执行完成，显示用户数:', displayedUsers);
    console.log('总用户数:', Object.keys(users).length);
}

// 界面更新函数
function updateMainInterface() {
    document.getElementById('currentUser').textContent = currentUser;
    
    if (isAdmin) {
        document.getElementById('adminBtn').classList.remove('hidden');
        document.getElementById('downgradeBtn').classList.remove('hidden');
    } else {
        document.getElementById('adminBtn').classList.add('hidden');
        document.getElementById('downgradeBtn').classList.add('hidden');
    }
    
    updatePredictionsList();
    updateLeaderboard();
    updateHistory();
    updateRoundSelector();
    updateDeadlineDisplay();
    updateMatchSelectionDisplay();
}

function updateAdminInterface() {
    updateMatchResultsList();
    updateUserList();
    updateRoundSelector();
    updateCurrentRoundDisplay();
    updateCurrentDeadlineDisplay();
    updateScheduledMatchesDisplay(); // 确保轮次管理界面更新
    updateMatchResultsForScheduledMatches();
}

// 排行榜标签页切换
function showTotalLeaderboard() {
    // 更新标签页状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // 显示累计总分榜
    document.getElementById('totalLeaderboardContainer').classList.remove('hidden');
    document.getElementById('roundLeaderboardContainer').classList.add('hidden');
}

function showRoundLeaderboard() {
    // 更新标签页状态
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // 显示单轮排行榜
    document.getElementById('totalLeaderboardContainer').classList.add('hidden');
    document.getElementById('roundLeaderboardContainer').classList.remove('hidden');
    
    // 更新单轮排行榜
    updateRoundLeaderboard();
    
    // 确保轮次选择器有正确的值
    const roundSelect = document.getElementById('roundSelect');
    if (roundSelect && !roundSelect.value && roundSelect.options.length > 1) {
        roundSelect.value = roundSelect.options[1].value; // 选择第一个非空选项
        updateRoundLeaderboard();
    }
}

// 更新轮次选择器
function updateRoundSelector() {
    const roundSelect = document.getElementById('roundSelect');
    if (!roundSelect) return;
    
    roundSelect.innerHTML = '<option value="">请选择轮次</option>';
    
    // 获取所有有记录的轮次（包括当前轮次）
    const allRounds = [];
    for (let i = 1; i <= currentRound; i++) {
        allRounds.push(i);
    }
    
    // 添加有历史记录的轮次
    Object.keys(history).forEach(round => {
        if (!allRounds.includes(parseInt(round))) {
            allRounds.push(parseInt(round));
        }
    });
    
    // 排序轮次
    allRounds.sort((a, b) => a - b);
    
    allRounds.forEach(round => {
        const option = document.createElement('option');
        option.value = round;
        option.textContent = `第${round}轮`;
        roundSelect.appendChild(option);
    });
    
    // 如果有轮次，默认选择第一轮
    if (allRounds.length > 0) {
        roundSelect.value = allRounds[0];
        updateRoundLeaderboard();
    }
}

// 更新单轮排行榜
function updateRoundLeaderboard() {
    /*
    const selectedRound = document.getElementById('roundSelect').value;
    const container = document.getElementById('roundLeaderboardContainer');
    
    if (!selectedRound) {
        container.innerHTML = '<p>请选择轮次</p>';
        return;
    }
    
    const roundData = history[selectedRound];
    if (!roundData || roundData.length === 0) {
        container.innerHTML = '<p>该轮暂无数据</p>';
        return;
    }
    
    // 按得分排序
    const sortedData = [...roundData].sort((a, b) => b.score - a.score);
    
    container.innerHTML = '';
    sortedData.forEach((item, index) => {
        const roundItem = document.createElement('div');
        roundItem.className = 'leaderboard-item';
        roundItem.innerHTML = `
            <div class="rank-info">
                <strong>第${index + 1}名: ${item.username}</strong>
                <span>得分: ${item.score}</span>
                <span>排名: ${item.rank}/${sortedData.length}</span>
            </div>
        `;
        container.appendChild(roundItem);
    });
    */
    const selectedRound = document.getElementById('roundSelect').value;
    const container = document.getElementById('roundLeaderboardContainer');
    
    if (!selectedRound) {
        container.innerHTML = '<p>请选择轮次</p>';
        return;
    }
    
    // 实时计算该轮次每个用户的得分
    const roundScores = {};
    
    for (const username in predictions) {
        let userScore = 0;
        const userPredictions = predictions[username];
        
        for (const matchKey in userPredictions) {
            const prediction = userPredictions[matchKey];
            if (prediction.round === parseInt(selectedRound) && matchResults[matchKey]) {
                const result = matchResults[matchKey];
                const score = calculateMatchScore(prediction, result);
                userScore += score;
            }
        }
        
        // 只添加有得分的用户
        if (userScore > 0) {
            roundScores[username] = userScore;
        }
    }
    
    if (Object.keys(roundScores).length === 0) {
        container.innerHTML = '<p>该轮暂无得分数据</p>';
        return;
    }
    
    // 按得分排序
    const sortedData = Object.entries(roundScores)
        .map(([username, score]) => ({ username, score }))
        .sort((a, b) => b.score - a.score);
    
    container.innerHTML = '';
    sortedData.forEach((item, index) => {
        const roundItem = document.createElement('div');
        roundItem.className = 'leaderboard-item';
        roundItem.innerHTML = `
            <div class="rank-info">
                <strong>第${index + 1}名: ${item.username}</strong>
                <span>得分: ${item.score}</span>
                <span>排名: ${index + 1}/${sortedData.length}</span>
            </div>
        `;
        container.appendChild(roundItem);
    });
}

function updatePredictionsList() {
    const container = document.getElementById('predictionsContainer');
    container.innerHTML = '';
    
    if (predictions[currentUser]) {
        for (const matchKey in predictions[currentUser]) {
            const pred = predictions[currentUser][matchKey];
            const predItem = document.createElement('div');
            predItem.className = 'prediction-item';
            
            const canEdit = pred.round === currentRound && !isDeadlineExpired(currentRound);
            
            predItem.innerHTML = `
                <div class="match-info">
                    <strong>${pred.team1} ${pred.score1} VS ${pred.score2} ${pred.team2}</strong>
                    <span>第${pred.round}轮</span>
                </div>
                <div class="actions">
                    ${canEdit ? `<button class="edit-btn" onclick="editPrediction('${matchKey}')">编辑</button>` : ''}
                    <button class="delete-btn" onclick="deletePrediction('${matchKey}')">删除</button>
                </div>
            `;
            container.appendChild(predItem);
        }
    }
    
    if (container.children.length === 0) {
        container.innerHTML = '<p>暂无预测记录</p>';
    }
}

function updateMatchResultsList() {
    // 现在使用新的函数来更新比赛结果界面
    updateMatchResultsForScheduledMatches();
}

function updateLeaderboard() {
    const container = document.getElementById('leaderboardContainer');
    container.innerHTML = '';
    
    leaderboard.forEach((item, index) => {
        const leaderboardItem = document.createElement('div');
        leaderboardItem.className = 'leaderboard-item';
        leaderboardItem.innerHTML = `
            <div class="rank-info">
                <strong>第${index + 1}名: ${item.username}</strong>
                <span>总分: ${item.totalScore}</span>
            </div>
        `;
        container.appendChild(leaderboardItem);
    });
    
    if (container.children.length === 0) {
        container.innerHTML = '<p>暂无排行榜数据</p>';
    }
}
function updateHistory() {
    const container = document.getElementById('historyContainer');
    container.innerHTML = '';
    
    for (const round in history) {
        const roundData = history[round];
        const roundItem = document.createElement('div');
        roundItem.className = 'history-item';
        
        let userRank = '未参与';
        const userRoundData = roundData.find(item => item.username === currentUser);
        if (userRoundData) {
            userRank = `第${userRoundData.rank}名 (得分: ${userRoundData.score})`;
        }
        
        roundItem.innerHTML = `
            <div class="round-info">
                <strong>第${round}轮</strong>
                <span>${userRank}</span>
            </div>
        `;
        container.appendChild(roundItem);
    }
    
    if (container.children.length === 0) {
        container.innerHTML = '<p>暂无历史记录</p>';
    }
}

// 删除功能
function deletePrediction(matchKey) {
    if (confirm('确定要删除这个预测吗？')) {
        delete predictions[currentUser][matchKey];
        saveData();
        updateMainInterface();
    }
}

// 编辑预测功能
function editPrediction(matchKey) {
    const prediction = predictions[currentUser][matchKey];
    
    if (!prediction) {
        alert('预测不存在');
        return;
    }
    
    // 检查是否超过截止时间
    if (isDeadlineExpired(prediction.round)) {
        alert('预测截止时间已过，无法修改！');
        return;
    }
    
    // 检查是否是当前轮次
    if (prediction.round !== currentRound) {
        alert('只能编辑当前轮次的预测！');
        return;
    }
    
    // 显示预测表单
    document.getElementById('predictionForm').classList.remove('hidden');
    document.getElementById('selectedMatchDisplay').textContent = `${prediction.team1} VS ${prediction.team2}`;
    
    // 填充输入框
    document.getElementById('score1').value = prediction.score1;
    document.getElementById('score2').value = prediction.score2;
    
    // 设置当前选中的比赛
    window.selectedMatch = { team1: prediction.team1, team2: prediction.team2 };
    
    // 修改按钮文本和功能
    const submitButton = document.querySelector('#predictionForm button');
    submitButton.textContent = '保存修改';
    submitButton.onclick = function() {
        updatePrediction(matchKey);
    };
    
    // 滚动到预测表单
    document.getElementById('predictionForm').scrollIntoView({ behavior: 'smooth' });
}

function updatePrediction(matchKey) {
    const prediction = predictions[currentUser][matchKey];
    if (!prediction) {
        alert('预测不存在');
        return;
    }
    
    const score1 = parseInt(document.getElementById('score1').value);
    const score2 = parseInt(document.getElementById('score2').value);
    
    if (isNaN(score1) || isNaN(score2)) {
        alert('请输入有效的比分');
        return;
    }
    
    // 更新预测
    predictions[currentUser][matchKey] = {
        team1: prediction.team1,
        team2: prediction.team2,
        score1: score1,
        score2: score2,
        round: currentRound,
        timestamp: new Date().toISOString()
    };
    
    saveData();
    
    // 清空输入框
    document.getElementById('score1').value = '';
    document.getElementById('score2').value = '';
    
    // 隐藏预测表单
    document.getElementById('predictionForm').classList.add('hidden');
    
    // 清除选中的比赛
    window.selectedMatch = null;
    
    // 恢复按钮状态
    const submitButton = document.querySelector('#predictionForm button');
    submitButton.textContent = '提交预测';
    submitButton.onclick = addPrediction;
    
    // 更新界面
    updateMainInterface();
    
    alert('预测更新成功！');
}

function deleteMatchResult(matchKey) {
    if (confirm('确定要删除这个比赛结果吗？')) {
        delete matchResults[matchKey];
        saveData();
        updateAdminInterface();
    }
}

// 管理员权限升级
function upgradeToAdmin() {
    const password = prompt('请输入管理员密码:');
    if (password === ADMIN_PASSWORD) {
        users[currentUser].isAdmin = true;
        isAdmin = true;
        saveData();
        alert('恭喜！您已升级为管理员！');
        updateMainInterface();
    } else {
        alert('管理员密码错误');
    }
}

// 管理员权限降级
function downgradeToUser() {
    if (currentUser === 'admin') {
        alert('默认管理员账户不能降级！');
        return;
    }
    
    if (confirm('确定要降级为普通用户吗？降级后将失去管理员权限。')) {
        users[currentUser].isAdmin = false;
        isAdmin = false;
        saveData();
        alert('您已降级为普通用户！');
        updateMainInterface();
    }
}

// 添加管理员升级按钮到主界面
document.addEventListener('DOMContentLoaded', function() {
    const userControls = document.querySelector('.user-controls');
    const upgradeBtn = document.createElement('button');
    upgradeBtn.textContent = '升级为管理员';
    upgradeBtn.onclick = upgradeToAdmin;
    upgradeBtn.style.display = 'none';
    upgradeBtn.id = 'upgradeBtn';
    userControls.appendChild(upgradeBtn);
});

// 定期检查并显示升级按钮
setInterval(function() {
    if (currentUser && !isAdmin) {
        const upgradeBtn = document.getElementById('upgradeBtn');
        if (upgradeBtn) {
            upgradeBtn.style.display = 'block';
        }
    }
}, 1000);

// 显示管理员面板子功能
function showMatchResults() {
    hideAdminPanels();
    document.getElementById('matchResultsSection').classList.remove('hidden');
    updateCurrentRoundDisplay();
    updateMatchResultsForScheduledMatches();
}

function showRoundManagement() {
    hideAdminPanels();
    document.getElementById('roundManagementSection').classList.remove('hidden');
    updateRoundsList();
    updateScheduledMatchesDisplay(); // 确保显示预设比赛
}

function showUserManagement() {
    hideAdminPanels();
    document.getElementById('userManagementSection').classList.remove('hidden');
}

function hideAdminPanels() {
    const adminPanels = document.querySelectorAll('.admin-panel');
    adminPanels.forEach(panel => panel.classList.add('hidden'));
}

// 轮次管理功能
function startNewRound() {
    if (confirm('确定要开始新轮次吗？当前轮次的预测和结果将被保留。')) {
        currentRound++;
        saveData();
        
        // 更新所有相关界面
        updateCurrentRoundDisplay();
        updateRoundsList();
        updateDeadlineDisplay();
        updateCurrentDeadlineDisplay();
        updateMainInterface();
        updateAdminInterface();
        
        alert(`已开始第${currentRound}轮！`);
    }
}

// DDL管理功能
function setDeadline() {
    const date = document.getElementById('deadlineDate').value;
    const time = document.getElementById('deadlineTime').value;
    
    if (!date || !time) {
        alert('请选择完整的日期和时间');
        return;
    }
    
    const deadline = new Date(`${date}T${time}`);
    const now = new Date();
    
    if (deadline <= now) {
        alert('截止时间不能早于当前时间');
        return;
    }
    
    deadlines[currentRound] = deadline.toISOString();
    saveData();
    
    // 清空输入框
    document.getElementById('deadlineDate').value = '';
    document.getElementById('deadlineTime').value = '';
    
    updateDeadlineDisplay();
    updateCurrentDeadlineDisplay();
    alert('截止时间设置成功！');
}

// 预设比赛管理功能
function addScheduledMatch() {
    const team1 = document.getElementById('scheduleTeam1').value.trim();
    const team2 = document.getElementById('scheduleTeam2').value.trim();
    
    if (!team1 || !team2) {
        alert('请输入完整的队伍名称');
        return;
    }
    
    if (team1 === team2) {
        alert('主队和客队不能相同');
        return;
    }
    
    // 检查是否已存在相同对阵
    const existingMatches = scheduledMatches[currentRound] || [];
    const matchExists = existingMatches.some(match => 
        (match.team1 === team1 && match.team2 === team2) ||
        (match.team1 === team2 && match.team2 === team1)
    );
    
    if (matchExists) {
        alert('该对阵已存在');
        return;
    }
    
    // 添加预设比赛
    if (!scheduledMatches[currentRound]) {
        scheduledMatches[currentRound] = [];
    }
    
    scheduledMatches[currentRound].push({
        id: Date.now().toString(),
        team1: team1,
        team2: team2,
        timestamp: new Date().toISOString()
    });
    
    // 保存数据
    saveData();
    
    // 清空输入框
    document.getElementById('scheduleTeam1').value = '';
    document.getElementById('scheduleTeam2').value = '';
    
    // 更新所有相关界面
    updateScheduledMatchesDisplay();
    updateMatchSelectionDisplay();
    updateMatchResultsForScheduledMatches();
    
    alert('比赛对阵添加成功！');
}

function removeScheduledMatch(matchId) {
    if (confirm('确定要删除这个比赛对阵吗？')) {
        // 确保scheduledMatches[currentRound]存在
        if (!scheduledMatches[currentRound]) {
            scheduledMatches[currentRound] = [];
        }
        
        // 过滤掉要删除的比赛
        scheduledMatches[currentRound] = scheduledMatches[currentRound].filter(match => match.id !== matchId);
        
        // 保存数据
        saveData();
        
        // 更新所有相关界面
        updateScheduledMatchesDisplay();
        updateMatchSelectionDisplay();
        updateMatchResultsForScheduledMatches();
        
        alert('比赛对阵删除成功！');
    }
}

function updateScheduledMatchesDisplay() {
    const container = document.getElementById('scheduledMatchesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const matches = scheduledMatches[currentRound] || [];
    
    if (matches.length === 0) {
        container.innerHTML = '<p>暂无预设比赛</p>';
        return;
    }
    
    matches.forEach(match => {
        const matchItem = document.createElement('div');
        matchItem.className = 'scheduled-match-item';
        matchItem.innerHTML = `
            <div class="scheduled-match-info">
                <strong>${match.team1} VS ${match.team2}</strong>
            </div>
            <div class="scheduled-match-actions">
                <button class="delete-btn" onclick="removeScheduledMatch('${match.id}')">删除</button>
            </div>
        `;
        container.appendChild(matchItem);
    });
}

function updateMatchSelectionDisplay() {
    const container = document.getElementById('scheduledMatchesForPrediction');
    if (!container) return;
    
    container.innerHTML = '';
    
    const matches = scheduledMatches[currentRound] || [];
    
    if (matches.length === 0) {
        container.innerHTML = '<p>管理员还未设置本轮比赛对阵</p>';
        return;
    }
    
    matches.forEach(match => {
        const matchItem = document.createElement('div');
        matchItem.className = 'match-selection-item';
        
        // 检查是否已预测
        const hasPrediction = predictions[currentUser] && 
            predictions[currentUser][`${match.team1}_${match.team2}`] &&
            predictions[currentUser][`${match.team1}_${match.team2}`].round === currentRound;
        
        if (hasPrediction) {
            matchItem.classList.add('predicted');
        }
        
        matchItem.innerHTML = `
            <div class="match-teams">${match.team1} VS ${match.team2}</div>
            <div class="match-status">
                ${hasPrediction ? '已预测' : '未预测'}
            </div>
            <div class="match-actions">
                ${!hasPrediction ? `<button onclick="selectMatchForPrediction('${match.team1}', '${match.team2}')">选择预测</button>` : 
                `<button onclick="editPrediction('${match.team1}_${match.team2}')">修改预测</button>`}
            </div>
        `;
        container.appendChild(matchItem);
    });
}

// 选择比赛进行预测
function selectMatchForPrediction(team1, team2) {
    // 检查是否超过截止时间
    if (isDeadlineExpired(currentRound)) {
        alert('预测截止时间已过，无法添加或修改预测！');
        return;
    }
    
    // 显示预测表单
    document.getElementById('predictionForm').classList.remove('hidden');
    document.getElementById('selectedMatchDisplay').textContent = `${team1} VS ${team2}`;
    
    // 清空输入框
    document.getElementById('score1').value = '';
    document.getElementById('score2').value = '';
    
    // 滚动到预测表单
    document.getElementById('predictionForm').scrollIntoView({ behavior: 'smooth' });
    
    // 设置当前选中的比赛
    window.selectedMatch = { team1, team2 };
}



function isDeadlineExpired(round) {
    if (!deadlines[round]) return false;
    
    const deadline = new Date(deadlines[round]);
    const now = new Date();
    return now > deadline;
}

function updateDeadlineDisplay() {
    const display = document.getElementById('deadlineDisplay');
    const currentRoundDisplay = document.getElementById('currentRoundDisplay2');
    
    if (currentRoundDisplay) {
        currentRoundDisplay.textContent = currentRound;
    }
    
    if (display) {
        if (deadlines[currentRound]) {
            const deadline = new Date(deadlines[currentRound]);
            const isExpired = isDeadlineExpired(currentRound);
            
            display.textContent = deadline.toLocaleString('zh-CN');
            display.className = isExpired ? 'deadline-expired' : 'deadline-active';
        } else {
            display.textContent = '未设置';
            display.className = '';
        }
    }
}

function updateCurrentDeadlineDisplay() {
    const display = document.getElementById('currentDeadlineDisplay');
    if (display) {
        if (deadlines[currentRound]) {
            const deadline = new Date(deadlines[currentRound]);
            display.textContent = deadline.toLocaleString('zh-CN');
        } else {
            display.textContent = '未设置';
        }
    }
}

function resetCurrentRound() {
    if (confirm('确定要重置当前轮次吗？这将删除当前轮次的所有预测和结果！')) {
        // 删除当前轮次的预测
        for (const username in predictions) {
            for (const matchKey in predictions[username]) {
                if (predictions[username][matchKey].round === currentRound) {
                    delete predictions[username][matchKey];
                }
            }
        }
        
        // 删除当前轮次的结果
        for (const matchKey in matchResults) {
            if (matchResults[matchKey].round === currentRound) {
                delete matchResults[matchKey];
            }
        }
        
        // 删除当前轮次的截止时间
        delete deadlines[currentRound];
        
        // 删除当前轮次的预设比赛
        delete scheduledMatches[currentRound];
        
        // 保存数据
        saveData();
        
        // 更新所有相关界面
        updateAdminInterface();
        updateMainInterface();
        updateDeadlineDisplay();
        updateCurrentDeadlineDisplay();
        updateScheduledMatchesDisplay();
        updateMatchSelectionDisplay();
        updateMatchResultsForScheduledMatches();
        
        alert('当前轮次已重置！');
    }
}

function updateCurrentRoundDisplay() {
    const display = document.getElementById('currentRoundDisplay');
    if (display) {
        display.textContent = currentRound;
    }
}

function updateRoundsList() {
    const container = document.getElementById('roundsContainer');
    container.innerHTML = '';
    
    // 获取所有轮次（包括当前轮次）
    const allRounds = [];
    for (let i = 1; i <= currentRound; i++) {
        allRounds.push(i);
    }
    
    allRounds.forEach(round => {
        const roundItem = document.createElement('div');
        roundItem.className = 'round-item';
        
        const roundMatches = getMatchesByRound(round);
        const roundPredictions = getPredictionsByRound(round);
        
        roundItem.innerHTML = `
            <div class="round-info">
                <strong>第${round}轮</strong>
                <div>比赛数量: ${roundMatches.length}</div>
                <div>参与用户: ${roundPredictions.length}</div>
                ${round < currentRound ? '<span style="color: green;">已完成</span>' : '<span style="color: orange;">进行中</span>'}
            </div>
            <div class="round-actions">
                <button class="edit-result-btn" onclick="editRoundResults(${round})">编辑比分</button>
                ${round < currentRound ? `<button class="edit-btn" onclick="recalculateRound(${round})">重新计算</button>` : ''}
            </div>
        `;
        
        container.appendChild(roundItem);
    });
}

function getMatchesByRound(round) {
    const matches = [];
    for (const matchKey in matchResults) {
        if (matchResults[matchKey].round === round) {
            matches.push(matchResults[matchKey]);
        }
    }
    return matches;
}

function getPredictionsByRound(round) {
    const users = new Set();
    for (const username in predictions) {
        for (const matchKey in predictions[username]) {
            if (predictions[username][matchKey].round === round) {
                users.add(username);
            }
        }
    }
    return Array.from(users);
}

// 编辑轮次比分
function editRoundResults(round) {
    const roundMatches = getMatchesByRound(round);
    if (roundMatches.length === 0) {
        alert('该轮次暂无比赛结果');
        return;
    }
    
    const container = document.getElementById('roundsContainer');
    const roundItem = container.querySelector(`[onclick="editRoundResults(${round})"]`).closest('.round-item');
    
    // 创建编辑界面
    const editContainer = document.createElement('div');
    editContainer.className = 'match-result-edit';
    editContainer.innerHTML = `
        <h4>编辑第${round}轮比分</h4>
        <div id="editMatchesContainer"></div>
        <div style="margin-top: 15px;">
            <button onclick="saveRoundResults(${round})">保存修改</button>
            <button onclick="cancelEdit(${round})">取消编辑</button>
        </div>
    `;
    
    roundItem.appendChild(editContainer);
    
    // 显示比赛编辑表单
    const editMatchesContainer = editContainer.querySelector('#editMatchesContainer');
    roundMatches.forEach((match, index) => {
        const matchEdit = document.createElement('div');
        matchEdit.style.marginBottom = '15px';
        matchEdit.style.padding = '10px';
        matchEdit.style.border = '1px solid #e2e8f0';
        matchEdit.style.borderRadius = '5px';
        
        matchEdit.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>比赛 ${index + 1}: ${match.team1} VS ${match.team2}</strong>
            </div>
            <div>
                <input type="number" id="edit_score1_${round}_${index}" value="${match.score1}" min="0" style="width: 80px;">
                <span style="margin: 0 10px;">VS</span>
                <input type="number" id="edit_score2_${round}_${index}" value="${match.score2}" min="0" style="width: 80px;">
            </div>
        `;
        
        editMatchesContainer.appendChild(matchEdit);
    });
}

function saveRoundResults(round) {
    const roundMatches = getMatchesByRound(round);
    const matchKeys = Object.keys(matchResults).filter(key => matchResults[key].round === round);
    
    // 更新比分
    roundMatches.forEach((match, index) => {
        const newScore1 = parseInt(document.getElementById(`edit_score1_${round}_${index}`).value);
        const newScore2 = parseInt(document.getElementById(`edit_score2_${round}_${index}`).value);
        
        if (isNaN(newScore1) || isNaN(newScore2)) {
            alert('请输入有效的比分');
            return;
        }
        
        // 找到对应的matchKey并更新
        const matchKey = matchKeys[index];
        if (matchKey) {
            matchResults[matchKey].score1 = newScore1;
            matchResults[matchKey].score2 = newScore2;
        }
    });
    
    saveData();
    alert('比分修改成功！');
    updateRoundsList();
}

function cancelEdit(round) {
    const roundItem = document.querySelector(`[onclick="editRoundResults(${round})"]`).closest('.round-item');
    const editContainer = roundItem.querySelector('.match-result-edit');
    if (editContainer) {
        editContainer.remove();
    }
}

// 重新计算轮次得分
function recalculateRound(round) {
    if (confirm(`确定要重新计算第${round}轮得分吗？这将覆盖之前的计算结果。`)) {
        /*
        // 删除该轮次的历史记录
        if (history[round]) {
            delete history[round];
        }
        
        // 重新计算该轮次得分
        const roundScores = {};
        
        for (const username in predictions) {
            if (!roundScores[username]) {
                roundScores[username] = 0;
            }
            
            const userPredictions = predictions[username];
            for (const matchKey in userPredictions) {
                const prediction = userPredictions[matchKey];
                if (prediction.round === round && matchResults[matchKey]) {
                    const result = matchResults[matchKey];
                    const score = calculateMatchScore(prediction, result);
                    roundScores[username] += score;
                }
            }
        }
        
        // 更新排行榜
        for (const username in roundScores) {
            if (!leaderboard.find(item => item.username === username)) {
                leaderboard.push({
                    username: username,
                    totalScore: 0,
                    rounds: []
                });
            }
            
            const leaderboardItem = leaderboard.find(item => item.username === username);
            
            // 移除该轮次的旧得分
            leaderboardItem.rounds = leaderboardItem.rounds.filter(r => r.round !== round);
            leaderboardItem.totalScore = leaderboardItem.rounds.reduce((sum, r) => sum + r.score, 0);
            
            // 添加新的得分
            leaderboardItem.totalScore += roundScores[username];
            leaderboardItem.rounds.push({
                round: round,
                score: roundScores[username]
            });
        }
        
        // 按总分排序
        leaderboard.sort((a, b) => b.totalScore - a.totalScore);
        
        // 更新历史记录
        history[round] = [];
        for (const username in roundScores) {
            const rank = leaderboard.findIndex(item => item.username === username) + 1;
            history[round].push({
                username: username,
                score: roundScores[username],
                rank: rank
            });
        }
        */
       // 删除该轮次的历史记录
        if (history[round]) {
            delete history[round];
        }
        
        // 重新计算该轮次得分
        const roundScores = {};
        
        for (const username in predictions) {
            let userScore = 0;
            const userPredictions = predictions[username];
            
            for (const matchKey in userPredictions) {
                const prediction = userPredictions[matchKey];
                if (prediction.round === round && matchResults[matchKey]) {
                    const result = matchResults[matchKey];
                    const score = calculateMatchScore(prediction, result);
                    userScore += score;
                }
            }
            
            if (userScore > 0) {
                roundScores[username] = userScore;
            }
        }
        
        // 按得分排序，计算排名
        const roundRanking = Object.entries(roundScores)
            .map(([username, score]) => ({ username, score }))
            .sort((a, b) => b.score - a.score);
        
        // 更新历史记录
        history[round] = [];
        roundRanking.forEach((item, index) => {
            history[round].push({
                username: item.username,
                score: item.score,
                rank: index + 1
            });
        });
        
        // 历史记录按得分排序
        history[round].sort((a, b) => b.score - a.score);
        
        saveData();
        alert(`第${round}轮得分重新计算完成！`);
        
        // 更新相关界面
        updateRoundsList();
        updateRoundSelector();
        updateRoundLeaderboard();
        updateMainInterface();
    }
}

// 更新比赛结果页面的预设比赛显示
function updateMatchResultsForScheduledMatches() {
    const container = document.getElementById('matchResultsContainer');
    if (!container) return;
    
    // 清空现有内容
    container.innerHTML = '';
    
    // 显示预设比赛
    const scheduledMatchesList = document.createElement('div');
    scheduledMatchesList.className = 'scheduled-matches-section';
    scheduledMatchesList.innerHTML = '<h4>预设比赛列表</h4>';
    
    const matches = scheduledMatches[currentRound] || [];
    if (matches.length === 0) {
        scheduledMatchesList.innerHTML += '<p>暂无预设比赛</p>';
    } else {
        matches.forEach(match => {
            const matchItem = document.createElement('div');
            matchItem.className = 'scheduled-match-result-item';
            
            // 检查是否已有比赛结果
            const matchKey = `${match.team1}_${match.team2}`;
            const hasResult = matchResults[matchKey] && matchResults[matchKey].round === currentRound;
            
            matchItem.innerHTML = `
                <div class="match-info">
                    <strong>${match.team1} VS ${match.team2}</strong>
                    ${hasResult ? `<span style="color: green;">已有结果: ${matchResults[matchKey].score1} - ${matchResults[matchKey].score2}</span>` : '<span style="color: orange;">未输入结果</span>'}
                </div>
                <div class="match-actions">
                    ${!hasResult ? 
                        `<button onclick="inputMatchResultFromScheduled('${match.team1}', '${match.team2}')">输入结果</button>` :
                        `<button onclick="editMatchResult('${matchKey}')">编辑结果</button>`
                    }
                    <button onclick="deleteMatchResult('${matchKey}')" ${!hasResult ? 'style="display:none;"' : ''}>删除结果</button>
                </div>
            `;
            scheduledMatchesList.appendChild(matchItem);
        });
    }
    
    container.appendChild(scheduledMatchesList);
    
    // 显示手动输入比赛结果的表单
    const manualInputSection = document.createElement('div');
    manualInputSection.className = 'manual-input-section';
    manualInputSection.innerHTML = `
        <h4>手动输入比赛结果</h4>
        <div class="match-result-input">
            <input type="text" id="resultTeam1" placeholder="主队名称">
            <input type="number" id="resultScore1" placeholder="主队得分" min="0">
            <span>VS</span>
            <input type="number" id="resultScore2" placeholder="客队得分" min="0">
            <input type="text" id="resultTeam2" placeholder="客队名称">
            <button onclick="addMatchResult()">添加比赛结果</button>
        </div>
    `;
    
    container.appendChild(manualInputSection);
}

// 从预设比赛输入比赛结果
function inputMatchResultFromScheduled(team1, team2) {
    const score1 = prompt(`请输入${team1}的得分:`);
    const score2 = prompt(`请输入${team2}的得分:`);
    
    if (score1 === null || score2 === null) {
        return; // 用户取消
    }
    
    const score1Num = parseInt(score1);
    const score2Num = parseInt(score2);
    
    if (isNaN(score1Num) || isNaN(score2Num)) {
        alert('请输入有效的比分');
        return;
    }
    
    const matchKey = `${team1}_${team2}`;
    matchResults[matchKey] = {
        team1: team1,
        team2: team2,
        score1: score1Num,
        score2: score2Num,
        round: currentRound,
        timestamp: new Date().toISOString()
    };
    
    saveData();
    updateMatchResultsForScheduledMatches();
    
    alert('比赛结果添加成功！');
}

// 数据同步配置相关函数
function showDataSync() {
    hideAdminPanels();
    document.getElementById('dataSyncSection').classList.remove('hidden');
    updateSyncStatus();
}

function saveSyncConfig() {
    const token = document.getElementById('githubToken').value.trim();
    if (!token) {
        alert('请输入GitHub Personal Access Token');
        return;
    }
    
    // 检查是否已有Gist ID
    const existingGistId = localStorage.getItem('leagueScoreGistId');
    if (existingGistId) {
        GIST_CONFIG.gistId = existingGistId;
        localStorage.setItem('leagueScoreGistId', existingGistId);
    }
    
    GIST_CONFIG.token = token;
    localStorage.setItem('githubToken', token);
    
    // 测试token是否有效
    testSync();
}

async function testSync() {
    if (!GIST_CONFIG.token) {
        alert('请先配置GitHub Token');
        return;
    }
    
    try {
        // 测试token有效性
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${GIST_CONFIG.token}`,
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            alert(`Token验证成功！用户: ${user.login}`);
            
            // 尝试保存当前数据到Gist
            await saveDataToGist();
            updateSyncStatus();
        } else {
            alert('Token验证失败，请检查Token是否正确');
        }
    } catch (error) {
        alert('测试失败: ' + error.message);
    }
}

function clearSyncConfig() {
    if (confirm('确定要清除同步配置吗？这将删除所有云端数据！')) {
        GIST_CONFIG.token = '';
        GIST_CONFIG.gistId = '';
        localStorage.removeItem('githubToken');
        localStorage.removeItem('leagueScoreGistId');
        
        document.getElementById('githubToken').value = '';
        updateSyncStatus();
        alert('同步配置已清除');
    }
}

function updateSyncStatus() {
    const statusElement = document.getElementById('syncStatus');
    const gistIdElement = document.getElementById('gistIdDisplay');
    
    if (GIST_CONFIG.token) {
        statusElement.textContent = '已配置';
        statusElement.style.color = 'green';
    } else {
        statusElement.textContent = '未配置';
        statusElement.style.color = 'red';
    }
    
    if (GIST_CONFIG.gistId) {
        gistIdElement.textContent = GIST_CONFIG.gistId;
    } else {
        gistIdElement.textContent = '未创建';
    }
}

// 调试函数：检查同步状态
function debugSyncStatus() {
    console.log('=== 数据同步调试信息 ===');
    console.log('Token配置:', GIST_CONFIG.token ? '已配置' : '未配置');
    console.log('Gist ID:', GIST_CONFIG.gistId || '未创建');
    console.log('本地用户数:', Object.keys(users).length);
    console.log('本地用户列表:', Object.keys(users));
    
    // 尝试从Gist加载数据
    if (GIST_CONFIG.token && GIST_CONFIG.gistId) {
        fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            headers: {
                'Authorization': `token ${GIST_CONFIG.token}`,
            }
        })
        .then(response => response.json())
        .then(gist => {
            console.log('Gist数据:', gist);
            if (gist.files && gist.files[GIST_CONFIG.filename]) {
                const data = JSON.parse(gist.files[GIST_CONFIG.filename].content);
                console.log('云端用户数:', Object.keys(data.users || {}).length);
                console.log('云端用户列表:', Object.keys(data.users || {}));
            }
        })
        .catch(error => {
            console.error('获取Gist数据失败:', error);
        });
    }
}

// 页面加载时加载保存的token和Gist ID
function loadSavedToken() {
    const savedToken = localStorage.getItem('githubToken');
    const savedGistId = localStorage.getItem('leagueScoreGistId');
    
    if (savedToken) {
        GIST_CONFIG.token = savedToken;
        const tokenInput = document.getElementById('githubToken');
        if (tokenInput) {
            tokenInput.value = savedToken;
        }
    }
    
    if (savedGistId) {
        GIST_CONFIG.gistId = savedGistId;
    }
}
