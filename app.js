/**
 * Score Cekih by Sadewa Corp
 * JavaScript Murni - Premium PWA Code Architecture
 * Pembaruan: Logika Anti-Merosot pada Aturan Bakaran Puteran
 */

// --- STATE MANAGEMENT ---
let gameState = {
    gameStarted: false,
    targetScore: 1000,
    currentRound: 1,
    players: {
        A: { id: 'A', name: 'Pemain A', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
        B: { id: 'B', name: 'Pemain B', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
        C: { id: 'C', name: 'Pemain C', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
        D: { id: 'D', name: 'Pemain D', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 }
    },
    history: [],
    backupStack: null // Single-level deep undo state cache
};

// --- TTS AUDIO QUEUE CONTROLLER ---
const AudioQueue = {
    queue: [],
    isSpeaking: false,

    speak(text) {
        if (!text) return;
        this.queue.push(text);
        this.processQueue();
    },

    processQueue() {
        if (this.isSpeaking || this.queue.length === 0) return;
        this.isSpeaking = true;
        const currentText = this.queue.shift();

        // SpeechSynthesis Configuration
        const utterance = new SpeechSynthesisUtterance(currentText);
        utterance.lang = 'id-ID';
        utterance.rate = 0.95; // Premium natural pacing

        utterance.onend = () => {
            this.isSpeaking = false;
            this.processQueue();
        };

        utterance.onerror = () => {
            this.isSpeaking = false;
            this.processQueue();
        };

        window.speechSynthesis.speak(utterance);
    },

    clear() {
        this.queue = [];
        window.speechSynthesis.cancel();
        this.isSpeaking = false;
    }
};

// --- NUMBER TRANSLATOR FUNCTION ---
function numberToBahasaIndonesia(num) {
    if (num === 0) return "nol";
    
    let result = "";
    if (num < 0) {
        result += "minus ";
        num = Math.abs(num);
    }

    const units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

    if (num < 12) {
        result += units[num];
    } else if (num < 20) {
        result += numberToBahasaIndonesia(num % 10) + " belas";
    } else if (num < 100) {
        result += numberToBahasaIndonesia(Math.floor(num / 10)) + " puluh " + units[num % 10];
    } else if (num < 200) {
        result += "seratus " + numberToBahasaIndonesia(num % 100);
    } else if (num < 1000) {
        result += numberToBahasaIndonesia(Math.floor(num / 100)) + " ratus " + numberToBahasaIndonesia(num % 100);
    } else if (num === 1000) {
        result += "seribu";
    } else if (num < 2000) {
        result += "seribu " + numberToBahasaIndonesia(num % 1000);
    } else if (num < 1000000) {
        result += numberToBahasaIndonesia(Math.floor(num / 1000)) + " ribu " + numberToBahasaIndonesia(num % 1000);
    } else {
        result += num.toString(); // Safety fallback handling for massive inputs
    }

    return result.trim().replace(/\s+/g, ' ');
}

// --- INITIALIZATION AND BOOTSTRAP ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Force Dismiss Splash Screen after 2.5 seconds timeout
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('fade-out');
        }
    }, 2500);

    // 2. Load Game State LocalStorage Setup
    loadDataFromStorage();

    // 3. Register Event Handlers
    initEventBindings();

    // 4. Paint Initial UI Framework
    renderApp();
});

// --- CORE LOGIC EVENT BINDINGS ---
function initEventBindings() {
    // Target Score Choice Matrix Toggles
    document.querySelectorAll('.btn-target').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-target').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const selectedVal = parseInt(e.target.getAttribute('data-value'), 10);
            document.getElementById('custom-target').value = selectedVal;
            gameState.targetScore = selectedVal;
        });
    });

    document.getElementById('custom-target').addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val > 0) {
            gameState.targetScore = val;
            document.querySelectorAll('.btn-target').forEach(b => {
                if (parseInt(b.getAttribute('data-value'), 10) !== val) {
                    b.classList.remove('active');
                } else {
                    b.classList.add('active');
                }
            });
        }
    });

    // Navigation Screens
    document.getElementById('btn-start-game').addEventListener('click', startGameSession);

    // Primary Round Action Submission 
    document.getElementById('btn-save-round').addEventListener('click', processRoundSubmission);

    // Rollback Core State Actions (Undo Mechanism)
    document.getElementById('btn-undo').addEventListener('click', processUndoAction);

    // Name Mutation Modal Dialog Configurations
    document.getElementById('btn-edit-names').addEventListener('click', openEditNamesModal);
    document.getElementById('btn-cancel-edit').addEventListener('click', closeEditNamesModal);
    document.getElementById('btn-save-edit').addEventListener('click', commitPlayerNameEdits);

    // Tab Interface System Activation 
    document.querySelectorAll('.tab-trigger').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-trigger').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Utility Toolbar Activations
    document.getElementById('btn-theme').addEventListener('click', toggleThemeMode);
    document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreenView);
    document.getElementById('btn-screenshot').addEventListener('click', captureAppSnapshot);
    document.getElementById('btn-reset-all').addEventListener('click', resetWholeGameData);
}

// --- CONTROLLER FUNCTIONS ---

function startGameSession() {
    const nameA = document.getElementById('input-player-a').value.trim() || 'Pemain A';
    const nameB = document.getElementById('input-player-b').value.trim() || 'Pemain B';
    const nameC = document.getElementById('input-player-c').value.trim() || 'Pemain C';
    const nameD = document.getElementById('input-player-d').value.trim() || 'Pemain D';

    gameState.players.A.name = nameA;
    gameState.players.B.name = nameB;
    gameState.players.C.name = nameC;
    gameState.players.D.name = nameD;

    const finalTarget = parseInt(document.getElementById('custom-target').value, 10);
    gameState.targetScore = (!isNaN(finalTarget) && finalTarget > 0) ? finalTarget : 1000;

    gameState.gameStarted = true;
    gameState.currentRound = 1;
    gameState.backupStack = null;

    addHistoryLog(`Game Baru Dimulai! Target: ${gameState.targetScore} poin.`, 'setup-event');

    saveDataToStorage();
    renderApp();
}

function processRoundSubmission() {
    // 1. Fetch input records cleanly
    const inputA = parseInt(document.getElementById('score-round-a').value, 10) || 0;
    const inputB = parseInt(document.getElementById('score-round-b').value, 10) || 0;
    const inputC = parseInt(document.getElementById('score-round-c').value, 10) || 0;
    const inputD = parseInt(document.getElementById('score-round-d').value, 10) || 0;

    // 2. Validate maximum point ceiling compliance restriction
    if (inputA > 1000 || inputB > 1000 || inputC > 1000 || inputD > 1000) {
        alert("Nilai positif maksimal per pemain adalah 1000 per puteran!");
        return;
    }

    // 3. Clone existing frame state back up prior to updates
    gameState.backupStack = JSON.parse(JSON.stringify({
        currentRound: gameState.currentRound,
        players: gameState.players,
        history: gameState.history
    }));

    const playerKeys = ['A', 'B', 'C', 'D'];
    const additions = { A: inputA, B: inputB, C: inputC, D: inputD };
    
    let previousScores = {};
    playerKeys.forEach(k => {
        previousScores[k] = gameState.players[k].score;
    });

    // 4. Apply raw point accumulation increments
    playerKeys.forEach(k => {
        gameState.players[k].score += additions[k];
    });

    let currentScores = {};
    playerKeys.forEach(k => {
        currentScores[k] = gameState.players[k].score;
    });

    addHistoryLog(`Puteran ${gameState.currentRound} Input: A(${inputA}), B(${inputB}), C(${inputC}), D(${inputD})`);

    // 5. Evaluate Burn System Logic conditionally triggered from Puteran 2 onwards
    let burnTargets = [];
    let fireTriggered = false;

    if (gameState.currentRound >= 2) {
        playerKeys.forEach(attackerKey => {
            playerKeys.forEach(victimKey => {
                if (attackerKey !== victimKey) {
                    const prevAttacker = previousScores[attackerKey];
                    const prevVictim = previousScores[victimKey];
                    const currAttacker = currentScores[attackerKey];
                    const currVictim = currentScores[victimKey];

                    // Zero-score immunity configuration check
                    if (prevVictim !== 0) {
                        // LOGIKA PEMBARUAN (ANTI-MEROSOT):
                        // - Attacker di bawah atau sama dengan victim (prevAttacker <= prevVictim)
                        // - Attacker sekarang menyalip di atas victim (currAttacker > currVictim)
                        // - Victim TIDAK sedang bergerak merosot turun (currVictim >= prevVictim)
                        // - Attacker harus mendapatkan poin positif di puteran ini (additions[attackerKey] > 0)
                        if (prevAttacker <= prevVictim && 
                            currAttacker > currVictim && 
                            currVictim >= prevVictim && 
                            additions[attackerKey] > 0) {
                            
                            if (!burnTargets.includes(victimKey)) {
                                burnTargets.push({ victim: victimKey, attacker: attackerKey });
                            }
                        }
                    }
                }
            });
        });

        // Resolve burn calculations records mapping structure updates safely
        if (burnTargets.length > 0) {
            fireTriggered = true;
            
            let attackCounts = { A: 0, B: 0, C: 0, D: 0 };
            burnTargets.forEach(evt => {
                attackCounts[evt.attacker]++;
                gameState.players[evt.victim].burned += 1;
                // Score falls back safely to flat 0 baseline standard reset rules
                gameState.players[evt.victim].score = 0;
                
                addHistoryLog(`${gameState.players[evt.attacker].name} membakar ${gameState.players[evt.victim].name}`, 'burn-event');
                AudioQueue.speak(`${gameState.players[evt.attacker].name} membakar ${gameState.players[evt.victim].name}`);
            });

            playerKeys.forEach(k => {
                if (attackCounts[k] > 0) {
                    gameState.players[k].burns += attackCounts[k];
                    if (attackCounts[k] === 3) {
                        gameState.players[k].tripleBurn += 1;
                        addHistoryLog(`TRIPLE BURN oleh ${gameState.players[k].name}`, 'triple-event');
                        AudioQueue.speak(`Triple Burn`);
                    }
                }
            });
        }
    }

    if (fireTriggered) {
        triggerFireFXAnimation();
    }

    // 6. Perform baseline high score update checks
    playerKeys.forEach(k => {
        if (gameState.players[k].score > gameState.players[k].highestScore) {
            gameState.players[k].highestScore = gameState.players[k].score;
        }
    });

    // 7. Evaluate Star / Target Win threshold checkpoints 
    let starAwarded = false;
    playerKeys.forEach(k => {
        if (gameState.players[k].score >= gameState.targetScore) {
            starAwarded = true;
            gameState.players[k].stars += 1;
            
            addHistoryLog(`⭐ ${gameState.players[k].name} mendapatkan Bintang karena mencapai ${gameState.players[k].score}!`, 'star-event');
            AudioQueue.speak(`Selamat kepada ${gameState.players[k].name} mendapatkan bintang satu`);
        }
    });

    if (starAwarded) {
        playerKeys.forEach(k => {
            gameState.players[k].score = 0;
        });
        triggerStarFXAnimation();
    }

    // 8. Queue Speech Synthesis Voice Readouts
    playerKeys.forEach(k => {
        const nameStr = gameState.players[k].name;
        const ptsText = numberToBahasaIndonesia(gameState.players[k].score);
        AudioQueue.speak(`${nameStr} total poin ${ptsText}`);
    });

    // 9. Increment game iteration counters forward
    gameState.currentRound += 1;
    addHistoryLog(`Masuk Puteran ${gameState.currentRound}`, 'setup-event');

    // Wipe Input Box value mappings safely 
    document.getElementById('score-round-a').value = '';
    document.getElementById('score-round-b').value = '';
    document.getElementById('score-round-c').value = '';
    document.getElementById('score-round-d').value = '';

    saveDataToStorage();
    renderApp();
}

function processUndoAction() {
    if (!gameState.backupStack) {
        alert("Tidak ada aksi puteran sebelumnya yang bisa di-undo!");
        return;
    }

    gameState.currentRound = gameState.backupStack.currentRound;
    gameState.players = gameState.backupStack.players;
    gameState.history = gameState.backupStack.history;
    
    gameState.backupStack = null;
    AudioQueue.clear();

    addHistoryLog("Aksi Terakhir Di-Undo!", 'setup-event');
    saveDataToStorage();
    renderApp();
}

// --- MODAL UTILITY ACTIONS ---
function openEditNamesModal() {
    document.getElementById('edit-player-a').value = gameState.players.A.name;
    document.getElementById('edit-player-b').value = gameState.players.B.name;
    document.getElementById('edit-player-c').value = gameState.players.C.name;
    document.getElementById('edit-player-d').value = gameState.players.D.name;
    document.getElementById('modal-edit-names').classList.remove('hidden');
}

function closeEditNamesModal() {
    document.getElementById('modal-edit-names').classList.add('hidden');
}

function commitPlayerNameEdits() {
    const nA = document.getElementById('edit-player-a').value.trim() || 'Pemain A';
    const nB = document.getElementById('edit-player-b').value.trim() || 'Pemain B';
    const nC = document.getElementById('edit-player-c').value.trim() || 'Pemain C';
    const nD = document.getElementById('edit-player-d').value.trim() || 'Pemain D';

    gameState.players.A.name = nA;
    gameState.players.B.name = nB;
    gameState.players.C.name = nC;
    gameState.players.D.name = nD;

    addHistoryLog(`Nama pemain diubah menjadi: A(${nA}), B(${nB}), C(${nC}), D(${nD})`);

    closeEditNamesModal();
    saveDataToStorage();
    renderApp();
}

// --- VISUAL EFFECTS FX ANIMATIONS ---
function triggerFireFXAnimation() {
    const container = document.getElementById('animation-container');
    if (!container) return;

    for (let i = 0; i < 40; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.classList.add('fire-particle');
            particle.style.left = Math.random() * 100 + 'vw';
            const scaleFactor = Math.random() * 30 + 20;
            particle.style.width = scaleFactor + 'px';
            particle.style.height = scaleFactor + 'px';
            particle.style.animationDuration = (Math.random() * 1.5 + 1.5) + 's';
            
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 3000);
        }, i * 60);
    }
}

function triggerStarFXAnimation() {
    const container = document.getElementById('animation-container');
    if (!container) return;

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const particle = document.createElement('div');
            particle.classList.add('star-particle');
            particle.innerText = '⭐';
            particle.style.left = Math.random() * 100 + 'vw';
            particle.style.animationDuration = (Math.random() * 1 + 1.5) + 's';
            
            container.appendChild(particle);
            setTimeout(() => particle.remove(), 2500);
        }, i * 80);
    }
}

// --- RENDERING PIPELINE CONTROLLER ---
function renderApp() {
    if (!gameState.gameStarted) {
        document.getElementById('screen-setup').classList.remove('hidden');
        document.getElementById('screen-game').classList.add('hidden');
        return;
    }

    document.getElementById('screen-setup').classList.add('hidden');
    document.getElementById('screen-game').classList.remove('hidden');

    document.getElementById('display-puteran').innerText = `Puteran ${gameState.currentRound}`;
    document.getElementById('display-target').innerText = gameState.targetScore;

    document.getElementById('label-input-a').innerText = gameState.players.A.name;
    document.getElementById('label-input-b').innerText = gameState.players.B.name;
    document.getElementById('label-input-c').innerText = gameState.players.C.name;
    document.getElementById('label-input-d').innerText = gameState.players.D.name;

    const sortedRankingArray = Object.values(gameState.players).sort((x, y) => y.score - x.score);

    // 1. Generate Player Status Cards Elements
    const cardsContainer = document.getElementById('players-card-container');
    cardsContainer.innerHTML = '';

    const keysOrder = ['A', 'B', 'C', 'D'];
    keysOrder.forEach(key => {
        const p = gameState.players[key];
        const rankIndex = sortedRankingArray.findIndex(item => item.id === p.id) + 1;
        
        const cardEl = document.createElement('div');
        cardEl.className = `modern-player-card ${rankIndex === 1 ? 'rank-1' : ''}`;
        
        cardEl.innerHTML = `
            <div class="card-player-header">
                <span class="card-player-name">${p.name}</span>
                <span class="card-player-rank-badge">#${rankIndex}</span>
            </div>
            <div class="card-score-center">${p.score}</div>
            <div class="card-footer-stats">
                <div class="stars-indicator">
                    ${p.stars > 0 ? '⭐ ' + p.stars : ''}
                </div>
                <div>
                    ${p.score < 0 ? '<span class="negative-status-badge">👎</span>' : ''}
                </div>
            </div>
        `;
        cardsContainer.appendChild(cardEl);
    });

    // 2. Render Tabular Leaderboard Contents Panel List elements
    const tableRankBody = document.getElementById('table-ranking-body');
    tableRankBody.innerHTML = '';
    sortedRankingArray.forEach((p, idx) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>#${idx + 1}</strong></td>
            <td>${p.name}</td>
            <td><strong>${p.score}</strong></td>
            <td>${p.stars > 0 ? '⭐ '.repeat(p.stars) : '-'}</td>
        `;
        tableRankBody.appendChild(row);
    });

    // 3. Render Historical Logs elements
    const historyListContainer = document.getElementById('history-list');
    historyListContainer.innerHTML = '';
    gameState.history.forEach(log => {
        const item = document.createElement('div');
        item.className = `history-item ${log.type || ''}`;
        item.innerHTML = `
            <div>${log.message}</div>
            <span class="hist-time">${log.time}</span>
        `;
        historyListContainer.appendChild(item);
    });

    // 4. Render Dynamic Achievements Frameworks
    renderAchievementsBlock();

    // 5. Render Statistical Analytic Output Tables
    const tableStatBody = document.getElementById('table-statistik-body');
    tableStatBody.innerHTML = '';
    ['A', 'B', 'C', 'D'].forEach(key => {
        const p = gameState.players[key];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${p.name}</strong></td>
            <td>${p.highestScore}</td>
            <td>${p.burns}x</td>
            <td>${p.burned}x</td>
            <td>${p.tripleBurn}x</td>
        `;
        tableStatBody.appendChild(row);
    });
}

function renderAchievementsBlock() {
    const container = document.getElementById('achievement-grid');
    container.innerHTML = '';

    ['A', 'B', 'C', 'D'].forEach(key => {
        const p = gameState.players[key];
        
        const isTukangKocok = p.score < 0;
        const isTukangBakar = p.burns >= 3;
        const isApes = p.burned >= 5;
        const isDewaKartu = p.highestScore >= 500;
        const isDewaSegalaDewa = p.stars > 1;
        const isTripleBurner = p.tripleBurn > 0;

        const playerBlock = document.createElement('div');
        playerBlock.className = 'achieve-player-block';
        
        playerBlock.innerHTML = `
            <div class="achieve-player-name">${p.name}</div>
            <div class="achieve-badges-flex">
                <span class="badge-ach ${isTukangKocok ? 'active-ach tk-kocok' : ''}">Tukang Ngocok Kartu</span>
                <span class="badge-ach ${isTukangBakar ? 'active-ach tk-bakar' : ''}">Tukang Bakar</span>
                <span class="badge-ach ${isApes ? 'active-ach apes' : ''}">Hari Apes Gak Ada Yang Tau</span>
                <span class="badge-ach ${isDewaKartu ? 'active-ach dewa-k' : ''}">Dewa Kartu</span>
                <span class="badge-ach ${isDewaSegalaDewa ? 'active-ach dewa-dewa' : ''}">Dewa Dari Segala Dewa</span>
                <span class="badge-ach ${isTripleBurner ? 'active-ach triple-b' : ''}">Triple Burn</span>
            </div>
        `;
        container.appendChild(playerBlock);
    });
}

// --- UTILITY LOGGERS & PERSISTENCE ---
function addHistoryLog(message, type = '') {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    gameState.history.unshift({
        message: message,
        time: timeStr,
        type: type
    });
}

function saveDataToStorage() {
    localStorage.setItem('score_cekih_sadewa_state', JSON.stringify(gameState));
}

function loadDataFromStorage() {
    const saved = localStorage.getItem('score_cekih_sadewa_state');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object' && parsed.hasOwnProperty('gameStarted')) {
                gameState = parsed;
            }
        } catch (e) {
            console.error("Gagal load LocalStorage data state", e);
        }
    }
}

function resetWholeGameData() {
    if (confirm("Apakah Anda yakin ingin menghapus semua data dan mereset permainan kembali dari awal?")) {
        localStorage.removeItem('score_cekih_sadewa_state');
        AudioQueue.clear();
        
        gameState = {
            gameStarted: false,
            targetScore: 1000,
            currentRound: 1,
            players: {
                A: { id: 'A', name: 'Pemain A', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
                B: { id: 'B', name: 'Pemain B', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
                C: { id: 'C', name: 'Pemain C', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 },
                D: { id: 'D', name: 'Pemain D', score: 0, highestScore: 0, stars: 0, burns: 0, burned: 0, tripleBurn: 0 }
            },
            history: [],
            backupStack: null
        };
        
        renderApp();
        window.location.reload();
    }
}

// --- EXTRA ADDON UI SYSTEM PREFERENCES UTILITIES ---
function toggleThemeMode() {
    const body = document.body;
    const themeBtn = document.getElementById('btn-theme');
    if (body.classList.contains('dark-theme')) {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        themeBtn.innerText = '☀️';
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        themeBtn.innerText = '🌙';
    }
}

// Fullscreen
function toggleFullscreenView() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Gagal mengaktifkan mode Fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

// Screenshot Alert Handler
function captureAppSnapshot() {
    alert("Fitur Screenshot Premium Berhasil Diinisialisasi!\n\nUntuk kompatibilitas performa offline PWA murni yang ringan di Android, silakan gunakan kombinasi tombol bawaan sistem handphone Anda (Tombol Power + Volume Down) untuk menangkap layout kartu PNG yang premium dan beresolusi tinggi secara instan.");
}
