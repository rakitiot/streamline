// Konfigurasi Global
let appState = "IDLE"; // IDLE, RUNNING, PAUSED, STOPPED
let seconds = 0;
let timerInt, dataInt;
let cntGood = 0, cntBad = 0;
let selectedMode = "Gaya Bebas";
let currentSessionData = [];

// DOM Elements
const timerEl = document.getElementById('timer');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const btnDownload = document.getElementById('btn-download');

// Inisialisasi Grafik
let waveChart, gaugeChart;

function initCharts() {
    const ctxW = document.getElementById('waveChart').getContext('2d');
    waveChart = new Chart(ctxW, {
        type: 'line',
        data: {
            labels: Array(40).fill(''),
            datasets: [
                { label: 'Pitch', data: [], borderColor: '#22d3ee', borderWidth: 2, tension: 0.4, pointRadius: 0 },
                { label: 'Roll', data: [], borderColor: '#ffffff', borderWidth: 1, tension: 0.4, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { 
                y: { min: -45, max: 45, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#475569', font: { size: 9 } } },
                x: { display: false }
            },
            animation: false
        }
    });

    const ctxG = document.getElementById('gaugeChart').getContext('2d');
    gaugeChart = new Chart(ctxG, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#22d3ee', '#0f172a'],
                borderWidth: 0,
                circumference: 270,
                rotation: 225,
                cutout: '85%',
                borderRadius: 15
            }]
        },
        options: { plugins: { tooltip: { enabled: false } }, maintainAspectRatio: false }
    });
}

// Logic Kontrol Tombol
function selectMode(mode, btn) {
    if (appState !== "IDLE") return;
    selectedMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

btnStart.onclick = () => {
    appState = "RUNNING";
    updateUI();
    
    // Timer 1 Detik
    timerInt = setInterval(() => {
        seconds++;
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        timerEl.innerText = `${m}:${s}`;
    }, 1000);

    // Data Processor 5Hz
    dataInt = setInterval(processStream, 200);
};

btnPause.onclick = () => {
    appState = "PAUSED";
    clearInterval(timerInt);
    clearInterval(dataInt);
    updateUI();
};

btnStop.onclick = () => {
    clearInterval(timerInt);
    clearInterval(dataInt);
    showRecap();
    appState = "STOPPED";
    updateUI();
};

function processStream() {
    // 1. Simulasi Raw Data Sensor
    let p = parseFloat((Math.sin(Date.now() / 600) * 12 + (Math.random() * 3)).toFixed(1));
    let r = parseFloat((Math.cos(Date.now() / 800) * 8).toFixed(1));
    
    // 2. Logika Khusus Gaya Punggung
    // Pada gaya punggung, posisi ideal adalah terlentang (biasanya dibaca 180 derajat)
    // Di sini kita asumsikan sensor dikalibrasi agar '0' tetap posisi streamline datar
    let currentScore;
    
    if (selectedMode === "Gaya Punggung") {
        // Toleransi roll lebih ketat karena menjaga keseimbangan terlentang lebih sulit
        currentScore = Math.max(0, 100 - (Math.abs(p) * 3 + Math.abs(r) * 2)).toFixed(0);
    } else {
        // Mode gaya lain (bebas, dada, kupu)
        currentScore = Math.max(0, 100 - (Math.abs(p) * 2.5 + Math.abs(r))).toFixed(0);
    }

    // 3. Hitung Poin Pelanggaran/Optimal
    if (currentScore > 85) cntGood++;
    if (currentScore < 45) cntBad++;

    // 4. Simpan ke RAM untuk CSV
    currentSessionData.push({ t: seconds, p, r, s: currentScore });

    // 5. Update UI
    document.getElementById('val-pitch').innerText = p + '°';
    document.getElementById('val-roll').innerText = r + '°';
    document.getElementById('score-text').innerText = currentScore;
    document.getElementById('cnt-good').innerText = cntGood;
    document.getElementById('cnt-bad').innerText = cntBad;
    
    // Efek visual rotasi model tubuh
    document.getElementById('body-model').style.transform = `rotate(${p}deg)`;

    // 6. Update Grafik
    updateCharts(p, r, currentScore);
}

function updateUI() {
    const statusInd = document.getElementById('status-indicator');
    const info = document.getElementById('session-info');
    const recUI = document.getElementById('recording-ui');

    // Default Classes
    btnPause.className = "btn-action";
    btnStop.className = "btn-action";
    btnDownload.className = "btn-action";

    if (appState === "RUNNING") {
        statusInd.className = "w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_red]";
        info.innerText = `Merekam: ${selectedMode}`;
        recUI.classList.remove('hidden');
        
        btnStart.disabled = true; btnStart.style.opacity = "0.2";
        
        btnPause.disabled = false; btnPause.classList.add('btn-on-pause');
        btnPause.querySelector('span:last-child').innerText = "PAUSE";

        btnStop.disabled = false; btnStop.classList.add('btn-on-stop');
        btnDownload.disabled = true; btnDownload.style.opacity = "0.2";

    } else if (appState === "PAUSED") {
        statusInd.className = "w-2 h-2 bg-yellow-500 rounded-full";
        info.innerText = `Jeda: ${selectedMode}`;
        recUI.classList.add('hidden');

        btnStart.disabled = false; btnStart.style.opacity = "1";
        btnStart.querySelector('span:last-child').innerText = "LANJUTKAN";
        
        btnPause.disabled = true; btnPause.style.opacity = "0.2";
        btnPause.querySelector('span:last-child').innerText = "PAUSED";

        btnStop.disabled = false; btnStop.classList.add('btn-on-stop');
    } else {
        statusInd.className = "w-2 h-2 bg-slate-600 rounded-full";
        info.innerText = "Sistem Ready";
        recUI.classList.add('hidden');

        btnStart.disabled = false; btnStart.style.opacity = "1";
        btnStart.querySelector('span:last-child').innerText = "MULAI";
        btnPause.disabled = true; btnPause.style.opacity = "0.2";
        btnStop.disabled = true; btnStop.style.opacity = "0.2";

        if (currentSessionData.length > 0) {
            btnDownload.disabled = false; btnDownload.classList.add('btn-on-download');
        }
    }
}

function showRecap() {
    const m = document.getElementById('modal-recap');
    const c = document.getElementById('recap-content');
    document.getElementById('recap-title').innerText = `HASIL ${selectedMode}`;
    
    c.innerHTML = `
        <div class="flex justify-between items-center mb-2"><span>Waktu Sesi:</span><span class="mono font-bold text-white text-lg">${timerEl.innerText}</span></div>
        <div class="flex justify-between items-center mb-2"><span>Posture Optimal:</span><span class="mono text-emerald-400 text-lg">${cntGood}</span></div>
        <div class="flex justify-between items-center"><span>Pelanggaran:</span><span class="mono text-red-500 text-lg">${cntBad}</span></div>
    `;
    m.classList.remove('hidden');
}

function closeModal() {
    const list = document.getElementById('session-list');
    if (list.querySelector('p')) list.innerHTML = '';
    
    const h = `
        <div class="bg-slate-900/80 p-4 rounded-2xl border-l-4 border-cyan-500 mb-3 animate-fade-in">
            <div class="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                <span>${selectedMode.toUpperCase()}</span>
                <span>${new Date().toLocaleTimeString()}</span>
            </div>
            <div class="flex justify-between items-end">
                <span class="text-xs text-slate-300">Durasi ${timerEl.innerText}</span>
                <span class="text-cyan-400 font-black text-sm">${cntGood} OK</span>
            </div>
        </div>
    `;
    list.insertAdjacentHTML('afterbegin', h);
    
    document.getElementById('modal-recap').classList.add('hidden');
    appState = "IDLE";
    resetAll();
    updateUI();
}

function resetAll() {
    seconds = 0; cntGood = 0; cntBad = 0;
    timerEl.innerText = "00:00";
    document.getElementById('cnt-good').innerText = "0";
    document.getElementById('cnt-bad').innerText = "0";
    // DataPoints tidak di-reset agar bisa diunduh sampai user mulai sesi baru
}

btnDownload.onclick = () => {
    if (currentSessionData.length === 0) return;
    let csv = "Time(s),Pitch,Roll,Score,Mode\n" + currentSessionData.map(d => `${d.t},${d.p},${d.r},${d.s},${selectedMode}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `STREAMLINE_${selectedMode.replace(' ','_')}_${Date.now()}.csv`;
    a.click();
};

initCharts();