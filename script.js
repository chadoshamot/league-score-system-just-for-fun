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

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    showLogin();
});

// 数据存储和加载
function saveData() {
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

function loadData() {
    const data = localStorage.getItem('leagueScoreData');
    if (data) {
        const parsed = JSON.parse(data);
        users = parsed.users || {};
        predictions = parsed.predictions || {};
        matchResults = parsed.matchResults || {};
        leaderboard = parsed.leaderboard || [];
        history = parsed.history || {};
        currentRound = parsed.currentRound || 1;
        deadlines = parsed.deadlines || {}; // 加载截止时间
        scheduledMatches = parsed.scheduledMatches || {}; // 加载预设比赛
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
    updateAdminInterface();
}

function hideAllSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => section.classList.add('hidden'));
}

// 用户认证
function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        alert('请输入用户名和密码');
        return;
    }
    
    if (users[username] && users[username].password === password) {
        currentUser = username;
        isAdmin = users[username].isAdmin;
        showMainSection();
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } else {
        alert('用户名或密码错误');
    }
}

function register() {
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
    
    users[username] = {
        password: password,
        isAdmin: false,
        joinDate: new Date().toISOString()
    };
    
    saveData();
    alert('注册成功！');
    showLogin();
}

function logout() {
    currentUser = null;
    isAdmin = false;
    showLogin();
}

// 预测功能
function addPrediction() {
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
    
    saveData();
    updateMainInterface();
    
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
    
    alert(isUpdate ? '预测修改成功！' : '预测添加成功！');
}

// 管理员功能
function addMatchResult() {
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
    
    saveData();
    updateAdminInterface();
    
    // 清空输入框
    document.getElementById('resultTeam1').value = '';
    document.getElementById('resultTeam2').value = '';
    document.getElementById('resultScore1').value = '';
    document.getElementById('resultScore2').value = '';
    
    alert('比赛结果添加成功！');
}

function calculateScores() {
    if (Object.keys(matchResults).length === 0) {
        alert('请先添加比赛结果');
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
        leaderboardItem.totalScore += roundScores[username];
        leaderboardItem.rounds.push({
            round: currentRound,
            score: roundScores[username]
        });
    }
    
    // 按总分排序
    leaderboard.sort((a, b) => b.totalScore - a.totalScore);
    
    // 更新历史记录
    if (!history[currentRound]) {
        history[currentRound] = [];
    }
    
    for (const username in roundScores) {
        history[currentRound].push({
            username: username,
            score: roundScores[username],
            rank: leaderboard.findIndex(item => item.username === username) + 1
        });
    }
    
    // 历史记录按得分排序
    history[currentRound].sort((a, b) => b.score - a.score);
    
    currentRound++;
    saveData();
    
    alert(`第${currentRound - 1}轮得分计算完成！`);
    updateAdminInterface();
}

// 计算单场比赛得分（基于你的原始算法）
function calculateMatchScore(prediction, result) {
    const predWinLose = prediction.score1 - prediction.score2;
    const resultWinLose = result.score1 - result.score2;
    
    // 胜负预测是否正确
    const winLoseCorrect = (predWinLose > 0 && resultWinLose > 0) ||
                          (predWinLose < 0 && resultWinLose < 0) ||
                          (predWinLose === 0 && resultWinLose === 0);
    
    if (winLoseCorrect) {
        // 胜负预测正确
        if (prediction.score1 === result.score1 && prediction.score2 === result.score2) {
            return 5; // 完全正确
        } else if (predWinLose === resultWinLose) {
            return 4; // 净胜分正确
        } else {
            return 3; // 胜负正确但比分错误
        }
    } else {
        // 胜负预测错误
        if (prediction.score1 === result.score1 || prediction.score2 === result.score2) {
            return 2; // 部分比分正确
        } else {
            return 1; // 完全错误
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
    updateScheduledMatchesDisplay();
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
}

// 更新轮次选择器
function updateRoundSelector() {
    const roundSelect = document.getElementById('roundSelect');
    roundSelect.innerHTML = '<option value="">请选择轮次</option>';
    
    // 获取所有有记录的轮次
    const rounds = Object.keys(history).sort((a, b) => parseInt(a) - parseInt(b));
    
    rounds.forEach(round => {
        const option = document.createElement('option');
        option.value = round;
        option.textContent = `第${round}轮`;
        roundSelect.appendChild(option);
    });
    
    // 如果有轮次，默认选择第一轮
    if (rounds.length > 0) {
        roundSelect.value = rounds[0];
        updateRoundLeaderboard();
    }
}

// 更新单轮排行榜
function updateRoundLeaderboard() {
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
    const container = document.getElementById('matchResultsContainer');
    container.innerHTML = '';
    
    for (const matchKey in matchResults) {
        const result = matchResults[matchKey];
        const resultItem = document.createElement('div');
        resultItem.className = 'match-result-item';
        resultItem.innerHTML = `
            <div class="match-info">
                <strong>${result.team1} ${result.score1} VS ${result.score2} ${result.team2}</strong>
                <span>第${result.round}轮</span>
            </div>
            <div class="actions">
                <button class="delete-btn" onclick="deleteMatchResult('${matchKey}')">删除</button>
            </div>
        `;
        container.appendChild(resultItem);
    }
    
    if (container.children.length === 0) {
        container.innerHTML = '<p>暂无比赛结果</p>';
    }
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
    
    // 修改按钮文本
    const submitButton = document.querySelector('#predictionForm button');
    submitButton.textContent = '更新预测';
    submitButton.onclick = function() {
        updatePrediction(matchKey);
    };
    
    // 滚动到预测表单
    document.getElementById('predictionForm').scrollIntoView({ behavior: 'smooth' });
}

function updatePrediction(matchKey) {
    const team1 = document.getElementById('team1').value;
    const team2 = document.getElementById('team2').value;
    const score1 = parseInt(document.getElementById('score1').value);
    const score2 = parseInt(document.getElementById('score2').value);
    
    if (!team1 || !team2 || isNaN(score1) || isNaN(score2)) {
        alert('请填写完整的比赛信息');
        return;
    }
    
    // 更新预测
    predictions[currentUser][matchKey] = {
        team1: team1,
        team2: team2,
        score1: score1,
        score2: score2,
        round: currentRound,
        timestamp: new Date().toISOString()
    };
    
    saveData();
    updateMainInterface();
    
    // 清空输入框
    document.getElementById('team1').value = '';
    document.getElementById('team2').value = '';
    document.getElementById('score1').value = '';
    document.getElementById('score2').value = '';
    
    // 恢复按钮状态
    const addButton = document.querySelector('#predictionForm button');
    addButton.textContent = '添加预测';
    addButton.onclick = addPrediction;
    
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
}

function showRoundManagement() {
    hideAdminPanels();
    document.getElementById('roundManagementSection').classList.remove('hidden');
    updateRoundsList();
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
        updateCurrentRoundDisplay();
        updateRoundsList();
        updateDeadlineDisplay();
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
    
    saveData();
    
    // 清空输入框
    document.getElementById('scheduleTeam1').value = '';
    document.getElementById('scheduleTeam2').value = '';
    
    // 更新显示
    updateScheduledMatchesDisplay();
    updateMatchSelectionDisplay();
    
    alert('比赛对阵添加成功！');
}

function removeScheduledMatch(matchId) {
    if (confirm('确定要删除这个比赛对阵吗？')) {
        scheduledMatches[currentRound] = scheduledMatches[currentRound].filter(match => match.id !== matchId);
        saveData();
        
        // 更新显示
        updateScheduledMatchesDisplay();
        updateMatchSelectionDisplay();
        
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

// 修改预测功能（更新版本）
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
    
    // 修改按钮文本
    const submitButton = document.querySelector('#predictionForm button');
    submitButton.textContent = '更新预测';
    submitButton.onclick = function() {
        updatePrediction(matchKey);
    };
    
    // 滚动到预测表单
    document.getElementById('predictionForm').scrollIntoView({ behavior: 'smooth' });
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
        
        saveData();
        updateAdminInterface();
        updateDeadlineDisplay();
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
            history[round].push({
                username: username,
                score: roundScores[username],
                rank: leaderboard.findIndex(item => item.username === username) + 1
            });
        }
        
        // 历史记录按得分排序
        history[round].sort((a, b) => b.score - a.score);
        
        saveData();
        alert(`第${round}轮得分重新计算完成！`);
        updateRoundsList();
    }
}
