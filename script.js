// --- 核心數據 ---
const MAX_HP = 10;
const INITIAL_STATS = {
    dog: { maxHp: 14, initialHp: 6, emoji: "🐶" },
    cat: { maxHp: 12, initialHp: 6, emoji: "🐱" },
    rat: { maxHp: 10, initialHp: 2, emoji: "🐀" }
};

const STATUS_ICONS = {
    choked: "🧵",        // 勒頸
    poison: "☠️",        // 中毒
    crippled: "♿",       // 殘廢
    blocked: "🚫",        // 無法進食
    skin_disease: "🦠",   // 皮膚病
    parasite: "🪱"        // 寄生蟲
};

// 狀態中文名稱對照表
const STATUS_NAMES_CHINESE = {
    choked: "窒息/勒頸",
    poison: "中毒",
    crippled: "殘廢/重傷",
    blocked: "無法進食",
    skin_disease: "皮膚病",
    parasite: "寄生蟲",
    dead: "死亡"
};

// 狀態效果配置：定義每個狀態造成的額外傷害
const STATUS_EFFECTS = {
    choked: { damage: 1, icon: "🧵" },
    crippled: { damage: 1, icon: "♿" },
    poison: { damage: 0, icon: "☠️" },
    blocked: { damage: 0, icon: "🚫" },
    skin_disease: { damage: 0, icon: "🦠" },
    parasite: { damage: 0, icon: "🪱" }
};

/**
 * 遊戲狀態物件
 * 
 * @property {string} currentFaction - 當前玩家選擇的陣營 ('dog', 'cat', 'rat')
 * @property {number} currentHp - 當前生命值
 * @property {number} maxHp - 最大生命值
 * @property {number} round - 當前回合數（只在 processEndOfRound 中遞增）
 * @property {Object} status - 狀態效果計數器，例如：{ 'choked': 2, 'blocked': 1 }
 * @property {number} playerTurnPosition - 玩家在本回合的選擇順位 (1, 2, 3)
 * @property {number} roundsToNextEvent - 距離下次事件卡觸發的回合數
 * @property {Array<number>} usedEventIds - 已經使用過的事件卡 ID 列表
 */
let gameState = {
    currentFaction: null,
    currentHp: 0,
    maxHp: 0,
    round: 0,
    status: {}, // 改為物件計數器，例如：{ 'choked': 2, 'blocked': 1 }
    playerTurnPosition: 1, // 玩家順位 (1, 2, 3)
    roundsToNextEvent: 3, // 距離下次事件卡觸發的回合數
    usedEventIds: [], // 已經使用過的事件卡 ID 列表
    nextRoundDrawBonus: 0, // 抽牌獎勵，預設 0
    hungerBonus: 0, // 飢餓扣血額外加成
    nextRoundSwapCardId: null // 下一回合強制替換的食物卡 ID
};

let currentRoundCards = [];
let leftoverCard = null;

// --- 卡牌數據 ---
const foodCards = [
    { "id": 1, "name": "橡皮筋便當", "desc": "沒吃完的雞腿便當，綁著紅色橡皮筋。", "image": "🍱", "effects": { "dog": { "hp": 3, "status": "choked" }, "cat": { "hp": 2, "status": null }, "rat": { "hp": 2, "status": null } } },
    { "id": 2, "name": "塑膠袋熱湯", "desc": "裝在耐熱袋裡的湯，有肉味。", "image": "🍲", "effects": { "dog": { "hp": 1, "status": "blocked" }, "cat": { "hp": 1, "status": null }, "rat": { "hp": 2, "status": null } } },
    { "id": 3, "name": "貓罐頭(銳利)", "desc": "沒壓平的罐頭蓋，像刀片一樣。", "image": "🥫", "effects": { "dog": { "hp": 1, "status": null }, "cat": { "hp": 1, "status": "crippled" }, "rat": { "hp": 2, "status": null } } },
    { "id": 4, "name": "粉紅色肉塊", "desc": "混入農藥的鮮豔肉塊(毒)。", "image": "🍖", "effects": { "dog": { "hp": -5, "status": "poison" }, "cat": { "hp": -3, "status": "poison" }, "rat": { "hp": -2, "status": "poison" } } },
    { "id": 5, "name": "花生醬(黏鼠板)", "desc": "香氣濃郁的陷阱。", "image": "🥜", "effects": { "dog": { "hp": 1, "status": null }, "cat": { "hp": 1, "status": "blocked" }, "rat": { "hp": -8, "status": "dead" } } },
    { "id": 6, "name": "竹籤烤肉串", "desc": "串著竹籤的肉塊殘渣。", "image": "🍢", "effects": { "dog": { "hp": -2, "status": null }, "cat": { "hp": -1, "status": null }, "rat": { "hp": 2, "status": null } } },
    { "id": 7, "name": "巧克力/葡萄", "desc": "人類覺得好吃，對動物是劇毒。", "image": "🍫", "effects": { "dog": { "hp": -3, "status": "poison" }, "cat": { "hp": -2, "status": "poison" }, "rat": { "hp": 1, "status": null } } },
    { "id": 8, "name": "捕鼠籠炸雞", "desc": "放在籠子深處的炸雞。", "image": "🍗", "effects": { "dog": { "hp": 2, "status": "blocked" }, "cat": { "hp": 2, "status": null }, "rat": { "hp": -99, "status": "dead" } } },
    { "id": 9, "name": "乾燥劑", "desc": "混在食物包裝裡的小包。", "image": "🥡", "effects": { "dog": { "hp": -3, "status": "poison" }, "cat": { "hp": -1, "status": null }, "rat": { "hp": -1, "status": null } } },
    { "id": 10, "name": "藍色顆粒(蝸牛藥)", "desc": "有特殊麩皮味的致命毒藥。", "image": "🔵", "effects": { "dog": { "hp": -5, "status": "poison" }, "cat": { "hp": -2, "status": "poison" }, "rat": { "hp": -2, "status": "poison" } } },
    { "id": 11, "name": "發霉的麵包", "desc": "淋過雨、長出綠斑的麵包。", "image": "🍞", "effects": { "dog": { "hp": 0, "status": null }, "cat": { "hp": 0, "status": null }, "rat": { "hp": 1, "status": "parasite" } } },
    { "id": 12, "name": "麻辣鍋底", "desc": "紅通通充滿辣油與香料。", "image": "🥘", "effects": { "dog": { "hp": -1, "status": null }, "cat": { "hp": -1, "status": null }, "rat": { "hp": -3, "status": null } } },
    { "id": 13, "name": "牛奶", "desc": "易導致乳糖不耐症。", "image": "🥛", "effects": { "dog": { "hp": 0, "status": null }, "cat": { "hp": 0, "status": null }, "rat": { "hp": 2, "status": null } } },
    { "id": 14, "name": "含吸管手搖杯", "desc": "甜甜的飲料殘底。", "image": "🥤", "effects": { "dog": { "hp": -1, "status": null }, "cat": { "hp": 1, "status": null }, "rat": { "hp": 2, "status": null } } },
    { "id": 15, "name": "檳榔渣/菸蒂水", "desc": "混雜在垃圾堆裡的毒物。", "image": "🚬", "effects": { "dog": { "hp": -2, "status": "poison" }, "cat": { "hp": -1, "status": null }, "rat": { "hp": -2, "status": "poison" } } },
    { "id": 16, "name": "水溝油水", "desc": "餐廳後巷流出的油污。", "image": "🕳️", "effects": { "dog": { "hp": 1, "status": "skin_disease" }, "cat": { "hp": 0, "status": null }, "rat": { "hp": 3, "status": null } } },
    { "id": 17, "name": "長螞蟻的罐頭", "desc": "放太久爬滿紅火蟻。", "image": "🐜", "effects": { "dog": { "hp": -1, "status": null }, "cat": { "hp": -1, "status": null }, "rat": { "hp": -1, "status": null } } },
    { "id": 18, "name": "洋蔥炒剩菜", "desc": "濃郁的蔥蒜味，導致貧血。", "image": "🧅", "effects": { "dog": { "hp": -2, "status": null }, "cat": { "hp": -3, "status": null }, "rat": { "hp": 2, "status": null } } },
    { "id": 19, "name": "路殺動物屍體", "desc": "容易感染寄生蟲。", "image": "☠️", "effects": { "dog": { "hp": 1, "status": "parasite" }, "cat": { "hp": 1, "status": "parasite" }, "rat": { "hp": 3, "status": null } } },
    { "id": 20, "name": "含酒精甜湯", "desc": "肝臟無法代謝酒精。", "image": "🍺", "effects": { "dog": { "hp": -2, "status": "poison" }, "cat": { "hp": -2, "status": "poison" }, "rat": { "hp": 1, "status": null } } },
    { "id": 21, "name": "乾淨飼料", "desc": "碗裝的乾淨乾糧。", "image": "🥣", "effects": { "dog": { "hp": 3, "status": null }, "cat": { "hp": 3, "status": null }, "rat": { "hp": 1, "status": null } } },
    { "id": 22, "name": "碎骨頭堆", "desc": "尖銳的骨頭殘渣。", "image": "🦴", "effects": { "dog": { "hp": -2, "status": null }, "cat": { "hp": -1, "status": "crippled" }, "rat": { "hp": 2, "status": null } } },
    { "id": 23, "name": "未開封過期餅乾", "desc": "完整的包裝。", "image": "🍪", "effects": { "dog": { "hp": 0, "status": null }, "cat": { "hp": 0, "status": null }, "rat": { "hp": 3, "status": null } } },
    { "id": 24, "name": "清水", "desc": "解除大部分負面狀態。", "image": "💧", "effects": { "dog": { "hp": 1, "status": "cure" }, "cat": { "hp": 1, "status": "cure" }, "rat": { "hp": 1, "status": "cure" } } }
];

const eventCards = [
    { "id": 100, "name": "人類的野餐", "desc": "本回合抽牌階段，食物卡數量增加 2 張。", "image": "🧺", "effectType": "draw_bonus", "value": 2 },
    { "id": 101, "name": "廚房大掃除", "desc": "所有陣營的負面狀態（中毒、寄生蟲、窒息）全部移除。", "image": "🧹", "effectType": "status_clear", "targetStatuses": ["choked", "parasite", "poison"] },
    { "id": 102, "name": "停電了！", "desc": "下次事件卡觸發將被延遲 1 回合。", "image": "💡", "effectType": "turn_delay", "value": 1 },
    { "id": 103, "name": "食物恐慌", "desc": "下次事件卡觸發將被提前 1 回合。", "image": "😨", "effectType": "turn_advance", "value": 1 },
    { "id": 104, "name": "冬季來臨", "desc": "所有陣營的飢餓扣血值永久增加 1 點。", "image": "❄️", "effectType": "hunger_increase", "value": 1 },
    { "id": 105, "name": "超級豐收", "desc": "所有陣營恢復 2 點生命值。", "image": "🍎", "effectType": "heal_all", "value": 2 },
    { "id": 106, "name": "新寵物", "desc": "場上所有負面狀態的持續回合數增加 1。", "image": "🐕", "effectType": "status_duration_increase", "value": 1 },
    { "id": 107, "name": "衛生檢查", "desc": "所有陣營當前回合將承受額外 1 點傷害。", "image": "📋", "effectType": "damage_all", "value": 1 },
    { "id": 108, "name": "飢餓遊戲", "desc": "場上食物卡全部變成『碎骨頭堆』。", "image": "🦴", "effectType": "card_swap", "targetCardId": 1 },
    { "id": 109, "name": "廚師失誤", "desc": "場上食物卡全部變成『過期罐頭』。", "image": "🥫", "effectType": "card_swap", "targetCardId": 2 },
    { "id": 110, "name": "神秘商人", "desc": "下次回合的回合數判定將被延遲 2 回合。", "image": "🎩", "effectType": "turn_delay", "value": 2 },
    { "id": 111, "name": "能量飲", "desc": "所有陣營當次回合將恢復額外 1 點生命值。", "image": "⚡️", "effectType": "heal_all", "value": 1 }
];

// ===== 工具函數 =====

/**
 * 從陣列中隨機選取一個元素
 * @param {Array} array - 要選取的陣列
 * @returns {*} 隨機選中的元素
 */
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * 從陣列中隨機選取多個元素
 * @param {Array} array - 要選取的陣列
 * @param {number} count - 要選取的數量
 * @returns {Array} 隨機選中的元素陣列
 */
function getRandomElements(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

/**
 * 擲硬幣判定
 * @param {number} chance - 成功機率 (0-1)
 * @returns {boolean} true 表示成功，false 表示失敗
 */
function coinFlip(chance = 0.5) {
    return Math.random() < chance;
}

/**
 * 將卡牌元素變暗
 * @param {HTMLElement} element - 要變暗的卡牌元素
 */
function dimCard(element) {
    if (element) {
        element.classList.add('dimmed');
    }
}

/**
 * 移除卡牌元素（帶淡出效果）
 * @param {HTMLElement} element - 要移除的元素
 * @param {number} delay - 延遲時間（毫秒）
 */
function removeCardWithFade(element, delay = 500) {
    if (element) {
        element.style.opacity = '0';
        setTimeout(() => element.remove(), delay);
    }
}

// --- 遊戲啟動與畫面切換邏輯 ---

/**
 * 顯示角色選擇畫面
 */
function showFactionSelection() {
    // 隱藏起始畫面
    document.getElementById('splash-screen').classList.add('hidden');
    // 顯示角色選擇畫面
    document.getElementById('selection-screen').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // 綁定起始畫面的 START 按鈕
    document.getElementById('start-button').addEventListener('click', showFactionSelection);

    // 綁定角色選擇按鈕
    document.querySelectorAll('.faction-button').forEach(button => {
        button.addEventListener('click', function () {
            const faction = this.dataset.faction;
            startGame(faction);
        });
    });
});

const startGame = (faction) => {
    const stats = INITIAL_STATS[faction];
    if (!stats) return;

    // 1. 初始化遊戲狀態
    const { maxHp, initialHp, emoji } = stats;
    gameState.currentFaction = faction;
    gameState.maxHp = maxHp;
    gameState.currentHp = initialHp;
    gameState.round = 1;
    gameState.status = {};
    gameState.roundsToNextEvent = 3;
    gameState.usedEventIds = [];
    gameState.nextRoundDrawBonus = 0; // 初始化抽牌獎勵
    gameState.hungerBonus = 0; // 初始化飢餓加成
    gameState.stats = INITIAL_STATS; // 用於全體治療等效果
    gameState.nextRoundSwapCardId = null; // 初始化卡牌替換

    // 2. 切換畫面
    document.getElementById('selection-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');

    // 3. 渲染初始介面
    renderUI();
    logMessage(`🎉 歡迎，${emoji} ${faction} 開始求生之旅！HP: ${gameState.currentHp}/${gameState.maxHp}`);

    // 進入第一回合
    startRound();
};

const renderUI = () => {
    const factionEmoji = INITIAL_STATS[gameState.currentFaction].emoji;
    // 1. 處理狀態圖示：遍歷物件，顯示計數 > 0 的狀態
    const statusIcons = Object.entries(gameState.status)
        .filter(([status, count]) => count > 0)
        .map(([status, count]) => {
            const icon = STATUS_ICONS[status] || status;
            const cnName = STATUS_NAMES_CHINESE[status] || status;
            return `${icon} ${cnName} x${count}`;
        })
        .join(' ');
    // 2. 組合最終的狀態顯示字串
    document.getElementById('player-status').innerHTML =
        `${factionEmoji} ${gameState.currentFaction.toUpperCase()} (HP: ${gameState.currentHp}/${gameState.maxHp}) ${statusIcons}`;

    document.getElementById('round-counter').textContent = gameState.round;
};

function logMessage(message) {
    const logElement = document.getElementById('log');
    logElement.innerHTML += `<p>> ${message}</p>`;
    logElement.scrollTop = logElement.scrollHeight; // 保持在底部
}

const startRound = () => {
    logMessage(`--- 第 ${gameState.round} 回合開始 ---`);

    // 1. 決定順位
    const rand = Math.random();
    if (rand < 0.33) {
        gameState.playerTurnPosition = 1;
        logMessage(`🥇 本回合您優先選擇！`);
    } else if (rand < 0.66) {
        gameState.playerTurnPosition = 2;
    } else {
        gameState.playerTurnPosition = 3;
    }

    // 1. 清空卡牌區
    const cardArea = document.getElementById('card-area');
    cardArea.innerHTML = '';

    // 2. 準備卡牌
    let selectedCards = [];

    // 如果有留存卡牌，先加入
    if (leftoverCard) {
        selectedCards.push(leftoverCard);
        logMessage(`📦 上回合留存了: ${leftoverCard.name}`);
    }

    // 計算本回合需要抽取的卡牌數量（基礎 4 張 + 抽牌獎勵）
    const BASE_CARDS = 4;
    const numberOfCardsToDraw = BASE_CARDS + (gameState.nextRoundDrawBonus || 0);
    const cardsNeeded = numberOfCardsToDraw - selectedCards.length;

    // 準備新卡牌
    let newCards = [];

    if (gameState.nextRoundSwapCardId !== null) {
        // 替換：強制選擇目標卡牌
        const targetCard = foodCards.find(c => c.id === gameState.nextRoundSwapCardId);
        if (targetCard) {
            // 填充所有需要的卡牌為目標卡牌
            for (let i = 0; i < cardsNeeded; i++) {
                newCards.push(targetCard);
            }
            logMessage(`🔄 本回合食物卡已全部替換為【${targetCard.name}】！`);
        } else {
            // 如果找不到目標卡牌，回退到隨機抽取
            const pool = foodCards.filter(c => !selectedCards.some(sc => sc.id === c.id));
            newCards = getRandomElements(pool, cardsNeeded);
        }
        // 重置替換狀態
        gameState.nextRoundSwapCardId = null;
    } else {
        // 正常：隨機抽取
        // 過濾掉已在手牌中的卡 (避免重複 ID)
        const pool = foodCards.filter(c => !selectedCards.some(sc => sc.id === c.id));
        newCards = getRandomElements(pool, cardsNeeded);
    }

    selectedCards = [...selectedCards, ...newCards];
    currentRoundCards = selectedCards; // 更新全域變數

    // 抽牌完成後，重置抽牌獎勵
    gameState.nextRoundDrawBonus = 0;

    // 2.5. 預先鎖定邏輯 (根據順位決定電腦預先選走的卡牌)
    let preLockCount = 0;
    if (gameState.playerTurnPosition === 2) preLockCount = 1;
    if (gameState.playerTurnPosition === 3) preLockCount = 2;

    let preLockedCards = [];
    if (preLockCount > 0) {
        preLockedCards = getRandomElements(currentRoundCards, preLockCount);

        // 定義電腦陣營列表 (排除玩家陣營)
        const allFactions = Object.keys(INITIAL_STATS);
        const computerFactions = allFactions.filter(f => f !== gameState.currentFaction);

        // 從 currentRoundCards 移除預鎖定的卡牌，並產生動態 Log
        if (preLockCount === 1) {
            // 順位 2: 一個電腦陣營吃掉一張卡
            const preempter1 = getRandomElement(computerFactions);
            const preempter1Emoji = INITIAL_STATS[preempter1].emoji;
            const card1 = preLockedCards[0];

            currentRoundCards = currentRoundCards.filter(c => c.id !== card1.id);
            logMessage(`🥈 ${preempter1Emoji} ${preempter1} 吃掉了【${card1.name}】。您是第二順位。`);
        } else if (preLockCount === 2) {
            // 順位 3: 兩個電腦陣營各吃掉一張卡 (可能是同一陣營)
            const preempter1 = getRandomElement(computerFactions);
            const preempter2 = getRandomElement(computerFactions.filter(f => f !== preempter1)); // Ensure different preempter if possible
            const preempter1Emoji = INITIAL_STATS[preempter1].emoji;
            const preempter2Emoji = INITIAL_STATS[preempter2].emoji;
            const card1 = preLockedCards[0];
            const card2 = preLockedCards[1];

            currentRoundCards = currentRoundCards.filter(c => c.id !== card1.id && c.id !== card2.id);
            logMessage(`🥉 ${preempter1Emoji} ${preempter1} 吃掉了【${card1.name}】，且 ${preempter2Emoji} ${preempter2} 吃掉了【${card2.name}】。您是第三順位！`);
        }
    }

    // 3. 渲染卡牌
    selectedCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.id = `card-container-${card.id}`; // 方便後續查找
        cardEl.setAttribute('data-card-id', card.id);
        // 使用 Tailwind 樣式製作卡片外觀
        cardEl.className = 'bg-gray-600 p-4 rounded-lg shadow-lg hover:bg-gray-500 transition cursor-pointer flex flex-col items-center text-center h-64 justify-between border-2 border-gray-500 hover:border-yellow-400 relative group';

        // 根據卡片內容決定 Emoji
        const emoji = card.image;

        cardEl.innerHTML = `
            <div class="text-5xl mb-2 transform group-hover:scale-110 transition">${emoji}</div>
            <h3 class="font-bold text-xl mb-2 text-yellow-100">${card.name}</h3>
            <p class="text-sm text-gray-300 flex-grow">${card.desc}</p>
            <div class="mt-3 pt-3 border-t border-gray-500 w-full text-sm">
                <span class="text-green-400">❤️ ${card.effects[gameState.currentFaction].hp > 0 ? '+' : ''}${card.effects[gameState.currentFaction].hp}</span>
            </div>
        `;

        // 4. 添加點擊事件
        cardEl.addEventListener('click', () => handleCardClick(card.id));

        cardArea.appendChild(cardEl);

        // 5. 如果這張卡被預鎖定，套用 dimmed class
        if (preLockedCards.some(c => c.id === card.id)) {
            cardEl.classList.add('dimmed');
        }
    });
}

const handleCardClick = (cardId) => {
    // 1. 鎖定卡牌區 (防止重複點擊)
    const cardArea = document.getElementById('card-area');
    const cards = cardArea.querySelectorAll('div');
    cards.forEach(card => {
        card.style.pointerEvents = 'none';
        card.style.opacity = '0.5';
    });

    // 2. 找到卡牌數據
    const card = foodCards.find(c => c.id === cardId);
    if (!card) {
        console.error("Card not found!");
        return;
    }

    logMessage(`你選擇了: ${card.name}`);

    // --- 玩家效果結算 ---

    // 3. 計算效果（使用解構）
    const { hp: hpChange, status: statusEffect } = card.effects[gameState.currentFaction];

    // 狀態處理
    if (statusEffect === 'cure') {
        // 1. 清除狀態 (100% 成功)
        const cureList = ['choked', 'blocked', 'skin_disease', 'parasite', 'poisoned'];
        cureList.forEach(s => {
            if (gameState.status[s]) gameState.status[s] = 0;
        });
        logMessage(`✨ 身體淨化了！狀態已清除。`);
    } else if (statusEffect) {
        if (statusEffect === 'dead') {
            // 2. 死亡 (100% 觸發)
            gameState.currentHp = 0;
            logMessage(`☠️ 致命陷阱！直接死亡。`);
        } else {
            // 3. 其他負面狀態 (50% 機率) - 顯示彈窗
            // 應用 HP 變化（在彈窗前先處理）
            const oldHp = gameState.currentHp;
            gameState.currentHp = Math.min(gameState.currentHp + hpChange, gameState.maxHp);
            const actualChange = gameState.currentHp - oldHp;

            if (actualChange > 0) logMessage(`❤️ 恢復了 ${actualChange} 點 HP`);
            else if (actualChange < 0) logMessage(`💔 失去了 ${Math.abs(actualChange)} 點 HP`);
            else logMessage(`... 沒有恢復 HP`);

            // 顯示擲硬幣彈窗
            showFlipResultModal(card, statusEffect, cardId);
            return; // 暫停執行，等待彈窗關閉
        }
    }

    // 4. 應用 HP 變化
    const oldHp = gameState.currentHp;
    gameState.currentHp = Math.min(gameState.currentHp + hpChange, gameState.maxHp);
    const actualChange = gameState.currentHp - oldHp;

    if (actualChange > 0) logMessage(`❤️ 恢復了 ${actualChange} 點 HP`);
    else if (actualChange < 0) logMessage(`💔 失去了 ${Math.abs(actualChange)} 點 HP`);
    else logMessage(`... 沒有恢復 HP`);

    // 5. 繼續卡牌處理流程
    continueCardClickProcess(cardId);
};

/**
 * 顯示擲硬幣結果彈窗
 */
const showFlipResultModal = (card, statusEffect, cardId) => {
    // 執行擲硬幣判定
    const isSuccess = Math.random() >= 0.5;

    // 狀態說明對照表
    const statusDescriptions = {
        choked: '每回合額外扣 1 HP，直到狀態解除',
        poison: '中毒狀態，可能造成持續傷害',
        parasite: '寄生蟲感染，影響生存能力',
        blocked: '無法進食，下回合可能受限',
        skin_disease: '皮膚病，可能影響健康',
        crippled: '殘廢狀態，每回合額外扣 1 HP'
    };

    const statusDesc = statusDescriptions[statusEffect] || '未知效果';
    const statusIcon = STATUS_EFFECTS[statusEffect]?.icon || '❓';

    // 創建彈窗
    const modal = document.createElement('div');
    modal.id = 'flip-result-modal';
    modal.className = 'event-modal';

    // 決定結果訊息
    let resultTitle, resultMessage, resultColor;
    if (isSuccess) {
        resultTitle = '🎉 幸運逃過一劫';
        resultMessage = '您成功避開了卡牌風險，毫髮無傷。';
        resultColor = '#10b981'; // green
    } else {
        const cnName = STATUS_NAMES_CHINESE[statusEffect] || statusEffect.toUpperCase();
        resultTitle = `💔 狀態：${cnName}！`;
        resultMessage = `您未能避開風險，將承受此狀態帶來的後果...`;
        resultColor = '#ef4444'; // red
    }

    modal.innerHTML = `
        <div class="event-modal-content" style="background: linear-gradient(135deg, ${resultColor} 0%, #1f2937 100%);">
            <div class="event-icon" style="font-size: 80px;">🎲</div>
            <h2 class="event-title">${resultTitle}</h2>
            <p class="event-description">${resultMessage}</p>
            ${!isSuccess ? `<p class="text-sm text-gray-300 mb-4">效果：${statusDesc}</p>` : ''}
            <button class="event-confirm-btn" onclick="dismissFlipResultModal(${isSuccess}, '${statusEffect}', ${cardId})">
                確認
            </button>
        </div>
    `;

    document.body.appendChild(modal);
};

/**
 * 關閉擲硬幣結果彈窗
 */
const dismissFlipResultModal = (isSuccess, statusEffect, cardId) => {
    const modal = document.getElementById('flip-result-modal');
    if (modal) {
        modal.remove();
    }

    // 如果失敗，賦予狀態
    if (!isSuccess) {
        gameState.status[statusEffect] = (gameState.status[statusEffect] || 0) + 1;
        const cnName = STATUS_NAMES_CHINESE[statusEffect] || statusEffect;
        logMessage(`❌ 獲得 [${cnName}] (目前層數: ${gameState.status[statusEffect]})`);
    } else {
        const cnName = STATUS_NAMES_CHINESE[statusEffect] || statusEffect;
        logMessage(`✅ 幸運躲過 [${cnName}]`);
    }

    // 繼續卡牌處理流程
    continueCardClickProcess(cardId);
};

// 將函數設為全域，以便 onclick 可以呼叫
window.dismissFlipResultModal = dismissFlipResultModal;

/**
 * 繼續卡牌點擊處理流程（擲硬幣後）
 */
const continueCardClickProcess = (cardId) => {
    // 6. 檢查死亡
    if (checkDeath("食物中毒/受傷")) return;

    // 7. 最終棄牌邏輯 (確保只留 1 張)
    const unpickedCards = currentRoundCards.filter(c => c.id !== cardId);

    if (unpickedCards.length > 1) {
        const extraDiscardCount = unpickedCards.length - 1;
        const extraDiscards = getRandomElements(unpickedCards, extraDiscardCount);

        // 視覺移除多餘的卡牌
        extraDiscards.forEach(c => {
            const elementId = `card-container-${c.id}`;
            const elementToRemove = document.getElementById(elementId);
            dimCard(elementToRemove);
        });

        logMessage(`🗑️ 其他 ${extraDiscards.length} 張卡牌被丟棄了。`);
    }

    // 設定留存卡牌
    leftoverCard = unpickedCards[unpickedCards.length - 1];
    if (leftoverCard) {
        logMessage(`📦 ${leftoverCard.name} 被留到了下一回合`);
    }

    // 移除玩家點擊的卡牌 (視覺上只留下留存卡)
    const playerCardEl = document.getElementById(`card-container-${cardId}`);
    removeCardWithFade(playerCardEl);

    // 8. 進入事件階段
    setTimeout(() => {
        drawEvent();
    }, 1500);
};

const drawEvent = () => {
    // 事件階段直接進入回合結算
    processEndOfRound();
};

/**
 * 觸發事件卡（非重複抽取）
 */
const triggerEventCard = () => {
    // 確保事件回合結束後，計數器重置為 3
    gameState.roundsToNextEvent = 3;

    // 1. 過濾出所有未使用的事件卡
    const availableEvents = eventCards.filter(
        card => !gameState.usedEventIds.includes(card.id)
    );

    if (availableEvents.length === 0) {
        // 如果所有事件卡都用完了，則跳過本回合事件
        logMessage("💤 所有事件卡已全部觸發，本回合無事件發生。");
        startRound(); // 直接開始新回合
        return;
    }

    // 2. 隨機選取一張未使用的事件卡
    const chosenEvent = getRandomElement(availableEvents);

    // 3. 將其標記為已使用
    gameState.usedEventIds.push(chosenEvent.id);

    // 4. UI/Log 顯示
    logMessage(`✨ **事件卡觸發！【${chosenEvent.name}】發動了！**`);
    logMessage(`${chosenEvent.image} ${chosenEvent.desc}`);

    // 5. 顯示事件卡彈窗
    showEventModal(chosenEvent);
};

/**
 * 顯示事件卡彈窗
 */
const showEventModal = (event) => {
    // 創建彈窗容器
    const modal = document.createElement('div');
    modal.id = 'event-modal';
    modal.className = 'event-modal';

    // 設定內容
    modal.innerHTML = `
        <div class="event-modal-content">
            <div class="event-icon" style="font-size: 80px;">${event.image}</div>
            <h2 class="event-title">事件卡觸發：${event.name}</h2>
            <p class="event-description">${event.desc}</p>
            <button class="event-confirm-btn" onclick="dismissEventModal()">確認</button>
        </div>
    `;

    // 插入到 body
    document.body.appendChild(modal);
};

/**
 * 關閉事件卡彈窗
 */
const dismissEventModal = () => {
    const modal = document.getElementById('event-modal');
    if (modal) {
        modal.remove();
        // 彈窗關閉後，執行事件效果
        const chosenEvent = eventCards.find(e => gameState.usedEventIds[gameState.usedEventIds.length - 1] === e.id);
        if (chosenEvent) {
            applyEventEffect(chosenEvent);
        }
    }
};

// 將 dismissEventModal 設為全域函數，以便 onclick 可以呼叫
window.dismissEventModal = dismissEventModal;

/**
 * 應用事件卡效果
 */
const applyEventEffect = (event) => {
    const { effectType, value } = event;

    switch (effectType) {
        case 'draw_bonus':
            // 抽牌獎勵：增加下回合的卡牌數量
            gameState.nextRoundDrawBonus = (gameState.nextRoundDrawBonus || 0) + value;
            logMessage(`🎁 下回合將額外抽取 ${value} 張卡牌！`);
            break;

        case 'hp_change':
            // HP 變化
            gameState.currentHp = Math.min(gameState.currentHp + value, gameState.maxHp);
            if (value > 0) {
                logMessage(`❤️ 恢復了 ${value} 點 HP`);
            } else {
                logMessage(`💔 失去了 ${Math.abs(value)} 點 HP`);
            }
            renderUI();
            break;

        case 'status_clear':
            // 清除所有負面狀態
            logMessage("🌈 大掃除完成！所有負面狀態被清除！");

            // 清除玩家的負面狀態
            if (event.targetStatuses && Array.isArray(event.targetStatuses)) {
                event.targetStatuses.forEach(status => {
                    if (gameState.status[status] && gameState.status[status] > 0) {
                        gameState.status[status] = 0;
                        const statusIcon = STATUS_EFFECTS[status]?.icon || status;
                        const cnName = STATUS_NAMES_CHINESE[status] || status;
                        logMessage(`[清除] ${statusIcon} ${cnName} 狀態被移除。`);
                    }
                });
            }
            renderUI();
            break;

        case 'turn_delay':
            // 延遲下一回合事件觸發
            gameState.roundsToNextEvent += value;
            logMessage(`⏰ 停電了！下次事件卡將延遲 ${value} 回合觸發。`);
            break;

        case 'turn_advance':
            // 提前事件觸發
            gameState.roundsToNextEvent -= value;
            if (gameState.roundsToNextEvent < 1) gameState.roundsToNextEvent = 1;
            logMessage(`🏃 食物恐慌！下次事件卡將提前到剩餘 ${gameState.roundsToNextEvent} 回合時觸發。`);
            break;

        case 'hunger_increase':
            // 飢餓扣血額外加成
            gameState.hungerBonus = (gameState.hungerBonus || 0) + value;
            logMessage(`🥶 冬季來臨！所有陣營飢餓扣血值永久增加 ${value} 點。`);
            break;

        case 'heal_all':
            // 全體治療
            logMessage(`🎉 超級豐收！所有陣營恢復 ${value} 點生命！`);
            Object.keys(gameState.stats).forEach(faction => {
                const current = gameState.stats[faction].initialHp; // 使用初始 HP 作為當前 HP 基礎
                const max = gameState.stats[faction].maxHp;
                // 計算新 HP，確保不超過上限
                const newHp = Math.min(max, (gameState.currentFaction === faction ? gameState.currentHp : current) + value);
                if (gameState.currentFaction === faction) {
                    gameState.currentHp = newHp;
                }
                // 直接寫入 stats 以便未來參考（此處僅示範）
                gameState.stats[faction].initialHp = newHp;
                logMessage(`[治療] ${INITIAL_STATS[faction].emoji} ${faction} 恢復 ${value} HP。`);
            });
            renderUI();
            break;

        case 'status_duration_increase':
            // 負面狀態持續時間增加
            logMessage(`🕒 新寵物！所有陣營負面狀態持續時間增加 ${value} 回合。`);
            Object.keys(gameState.status).forEach(status => {
                if (gameState.status[status] > 0) {
                    gameState.status[status] += value;
                    const cnName = STATUS_NAMES_CHINESE[status] || status;
                    logMessage(`[延長] ${STATUS_EFFECTS[status]?.icon || ''} ${cnName} 持續時間增加 ${value} 回合。`);
                }
            });
            renderUI();
            break;

        case 'damage_all':
            // 全體傷害
            logMessage(`🚨 衛生檢查！所有陣營當前回合承受 ${value} 點傷害！`);
            Object.keys(gameState.stats).forEach(faction => {
                const current = (gameState.currentFaction === faction) ? gameState.currentHp : gameState.stats[faction].initialHp;
                const newHp = current - value;

                if (gameState.currentFaction === faction) {
                    gameState.currentHp = newHp;
                }
                gameState.stats[faction].initialHp = newHp;
                logMessage(`[傷害] ${INITIAL_STATS[faction].emoji} ${faction} 承受 ${value} HP 傷害。`);
            });
            renderUI();
            break;

        case 'card_swap':
            // 卡牌替換
            gameState.nextRoundSwapCardId = event.targetCardId;
            logMessage(`🔄 卡牌替換！下一回合場上食物卡將全部變為【${event.name}】指定的卡牌。`);
            break;

        case 'status_effect':
            // 狀態效果
            // TODO: 實作狀態效果邏輯
            break;

        default:
            logMessage(`⚠️ 未知的事件效果類型: ${effectType}`);
    }

    // 事件處理完畢，直接開始新回合
    startRound();
};

const applyStatusEffects = () => {
    let totalDamage = 0;

    Object.entries(gameState.status).forEach(([status, count]) => {
        if (count > 0 && STATUS_EFFECTS[status]) {
            const effect = STATUS_EFFECTS[status];
            if (effect.damage > 0) {
                const damage = effect.damage * count;
                totalDamage += damage;
                const cnName = STATUS_NAMES_CHINESE[status] || status;
                logMessage(`⚠️ ${effect.icon} [${cnName}] 造成額外 ${damage} 點傷害`);
            }
        }
    });

    return totalDamage;
};

/**
 * 回合結束處理函數（統一的回合結束邏輯）
 * 
 * 這是唯一執行回合結束邏輯的地方，包括：
 * 1. 回合數遞增
 * 2. 飢餓扣血
 * 3. 狀態效果傷害
 * 4. UI 更新
 * 5. 死亡檢查
 * 6. 開始新回合
 * 
 * 注意：handleCardClick 中的 checkDeath 是用於檢查立即死亡（如吃到致命食物），
 * 這裡的 checkDeath 是用於檢查飢餓和狀態效果導致的死亡。
 */
const processEndOfRound = () => {
    // 1. 執行回合數遞增（唯一的計數器位置）
    gameState.round++;

    // 2. 應用飢餔扣血和狀態效果傷害
    let baseDamage = 1 + (gameState.hungerBonus || 0);
    let statusDamage = applyStatusEffects();
    let totalDamage = baseDamage + statusDamage;

    gameState.currentHp -= totalDamage;
    logMessage(`📉 飢餔扣除 ${totalDamage} 點 HP (基礎: ${baseDamage}, 狀態: ${statusDamage})`);

    // 3. 更新 UI
    renderUI();

    // 4. 執行死亡檢查
    if (checkDeath("飢餔")) {
        return; // 如果死亡，停止執行
    }

    // 5. 遞減事件計數
    gameState.roundsToNextEvent--;

    // 6. 判定下一個狀態：事件回合或食物卡回合
    if (gameState.roundsToNextEvent <= 0) {
        // 觸發事件卡
        triggerEventCard();
    } else {
        // 進入下一個食物卡回合
        startRound();
    }
};

const checkDeath = (cause = "傷重不治") => {
    if (gameState.currentHp <= 0) {
        logMessage(`💀 ${cause}... 遊戲結束。`);
        alert(`遊戲結束！死因：${cause}。存活回合：${gameState.round}`);

        // 切換回選擇畫面
        document.getElementById('game-screen').classList.add('hidden');
        document.getElementById('selection-screen').classList.remove('hidden');

        // 重置部分狀態 (雖然 startGame 會重置，但這裡可以做一些清理或提示)
        logMessage(`--- 請重新選擇角色開始新遊戲 ---`);

        // 清除留存卡牌，避免影響下一局
        leftoverCard = null;
        currentRoundCards = [];

        return true;
    }
    return false;
};

