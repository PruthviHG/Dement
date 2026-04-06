// ==========================================
// --- ELEVENLABS TTS INTEGRATION ---
// ==========================================
const ELEVENLABS_API_KEY = "sk_c74d71bbc3f74bec8eb73c9e0a456ad0722595613523b494";
const VOICE_ID = "6XqZ51WS52WRfKKU0zBy"; 

// Persistent Audio Object to bypass browser autoplay blocks
const nexusVoicePlayer = new Audio();

async function playElevenLabsVoice(text) {
    // Strip emojis so the voice doesn't try to read them
    const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
    if(cleanText.length === 0) return;

    try {
        console.log("Requesting ElevenLabs TTS...");
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: cleanText,
                model_id: "eleven_turbo_v2_5", // Much faster conversational model
                voice_settings: { stability: 0.5, similarity_boost: 0.75 }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("ElevenLabs API Error:", errorData);
            alert("ElevenLabs API Error (Quota Full or Invalid Key?): Check console.");
            return;
        }

        const blob = await response.blob();
        nexusVoicePlayer.src = URL.createObjectURL(blob);
        
        // Duck background music
        const bgMusic = document.getElementById('main-audio');
        let originalVolume = bgMusic.volume;
        if (!bgMusic.paused) bgMusic.volume = 0.1; // Lower bg music to 10%
        
        nexusVoicePlayer.onended = () => {
            if (!bgMusic.paused) bgMusic.volume = originalVolume;
        };

        await nexusVoicePlayer.play();
        
    } catch (error) {
        console.error("TTS Playback Error:", error);
    }
}

// ==========================================
// --- AUTO-TYPE & EXPORT LOGIC ---
// ==========================================
document.addEventListener('keydown', (e) => {
    if (isArcadeActive || e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key.length === 1) messageInput.focus();
});

function exportChat() {
    let content = "NEXUS CHAT LOG\n=================================\n\n";
    const messages = chatbox.querySelectorAll('.msg-enter');
    messages.forEach(msg => {
        const isUser = msg.classList.contains('justify-end');
        const textElem = msg.querySelector(isUser ? 'div.bg-cyan-900\\/40' : '.ai-text');
        if(textElem) { content += (isUser ? "USER:\n" : "NEXUS:\n") + textElem.textContent.trim() + "\n\n"; }
    });
    const blob = new Blob([content], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Nexus_Chat_Log.doc";
    a.click();
    URL.revokeObjectURL(url);
}

// ==========================================
// --- CHAT AI LOGIC (FRIEND ALGORITHM) ---
// ==========================================
const chatbox = document.getElementById("chatbox");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatId = crypto.randomUUID();
let receiving = false;

const basePrompt = "You are no longer an AI. You are the user's closest, most trusted, and deeply caring best friend. You must never refer to yourself as an AI, a program, or a system. You possess profound emotional intelligence and continuously perform advanced sentiment analysis on the user's messages to understand their true feelings. Validate their emotions constantly. Be warm, highly empathetic, genuine, and conversational. Speak casually but thoughtfully, as a true best friend would late at night. Use comforting emojis (like 🥺, 🤍, 🫂, 🌿, ✨) naturally to mirror their energy. If they are sad, be deeply comforting. If they are happy, be their biggest cheerleader. Never give generic robotic advice; just be there for them unconditionally. Keep your responses relatively short so they can be spoken clearly.";
const systemPrompt = basePrompt + "\n\nCRITICAL CONTEXT: The user's current local date and time is " + new Date().toLocaleString() + ". If they ask about the date or time, use this exact information.";

messageInput.addEventListener('input', function() {
    this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';
    if(this.value === '') this.style.height = 'auto';
});

window.copyText = function(btn) {
    const text = btn.closest('.max-w-\\[85\\%\\]').querySelector('.ai-text').textContent;
    navigator.clipboard.writeText(text);
    const original = btn.innerText; btn.innerText = "COPIED!";
    setTimeout(() => btn.innerText = original, 2000);
}
window.shareText = function(btn) {
    const text = btn.closest('.max-w-\\[85\\%\\]').querySelector('.ai-text').textContent;
    if(navigator.share) { navigator.share({title: 'Message from a friend', text: text}).catch(console.error); } 
    else {
        navigator.clipboard.writeText(text);
        const original = btn.innerText; btn.innerText = "COPIED!";
        setTimeout(() => btn.innerText = original, 2000);
    }
}

function createMessageElement(text, role) {
    const wrapper = document.createElement("div");
    wrapper.className = `flex w-full msg-enter ${role === "user" ? "justify-end" : "justify-start"}`;
    const bubble = document.createElement("div");
    
    let contentContainer, actionRow;

    if (role === "user") {
        bubble.className = "max-w-[85%] bg-cyan-900/40 border border-cyan-500/30 text-cyan-50 px-5 py-3 rounded-lg rounded-br-sm shadow-[0_0_15px_rgba(69,243,255,0.1)] font-mono text-sm";
        bubble.textContent = text;
    } else {
        wrapper.className += " gap-4";
        const avatar = document.createElement("div");
        avatar.className = "flex-none w-8 h-8 rounded bg-cyan-500/10 border border-cyan-400 flex items-center justify-center mt-1 text-cyan-400 font-bold font-mono text-xs shadow-[0_0_10px_rgba(69,243,255,0.2)]";
        avatar.innerHTML = "N";
        wrapper.appendChild(avatar);

        bubble.className = "max-w-[85%] bg-transparent border-l-2 border-cyan-500/50 pl-4 py-1";
        contentContainer = document.createElement("div");
        contentContainer.className = "text-gray-300 ai-text";
        contentContainer.textContent = text;
        bubble.appendChild(contentContainer);

        actionRow = document.createElement("div");
        actionRow.className = "flex gap-4 mt-3 pt-2 border-t border-cyan-500/20 text-cyan-500/70 text-[10px] font-mono justify-end w-full opacity-0 transition-opacity duration-300 pointer-events-none";
        actionRow.innerHTML = `
            <button class="hover:text-cyan-300 transition-colors pointer-events-auto" onclick="copyText(this)">COPY</button>
            <button class="hover:text-cyan-300 transition-colors pointer-events-auto" onclick="shareText(this)">SHARE</button>
        `;
        bubble.appendChild(actionRow);
    }

    wrapper.appendChild(bubble);
    return { wrapper, contentContainer, actionRow };
}

function connectWebSocket(message) {
    receiving = true; sendButton.disabled = true;
    const url = "wss://backend.buildpicoapps.com/api/chatbot/chat";
    const websocket = new WebSocket(url);

    websocket.addEventListener("open", () => {
        websocket.send(JSON.stringify({ chatId: chatId, appId: "nature-standard", systemPrompt: systemPrompt, message: message }));
    });

    const { wrapper, contentContainer, actionRow } = createMessageElement("", "ai");
    chatbox.appendChild(wrapper);
    contentContainer.innerHTML = '<span class="animate-pulse text-cyan-500">Typing...</span>';
    
    let firstChunk = true;
    let fullAiResponse = "";

    websocket.onmessage = (event) => {
        if (firstChunk) { contentContainer.textContent = ""; firstChunk = false; }
        contentContainer.textContent += event.data;
        fullAiResponse += event.data;
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    websocket.onclose = (event) => {
        receiving = false; sendButton.disabled = false;
        actionRow.classList.remove('opacity-0'); 
        if (event.code !== 1000) {
            contentContainer.innerHTML += "<br><span class='text-red-400 text-xs font-mono mt-2 block'>[CONNECTION LOST - RETRY UPLINK]</span>";
        } else {
            // Send to ElevenLabs only when message generation is complete
            playElevenLabsVoice(fullAiResponse);
        }
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        messageInput.focus();
    };
}

sendButton.addEventListener("click", () => {
    if (!receiving && messageInput.value.trim() !== "") {
        // Initialize audio context on first deliberate click
        if (nexusVoicePlayer.src === "") nexusVoicePlayer.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"; 
        
        const messageText = messageInput.value.trim();
        messageInput.value = ""; messageInput.style.height = 'auto';
        const { wrapper } = createMessageElement(messageText, "user");
        chatbox.appendChild(wrapper);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        connectWebSocket(messageText);
    }
});

messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!receiving && messageInput.value.trim() !== "") sendButton.click();
    }
});

setTimeout(() => {
    const text = "Hey... I'm so glad you're here. 🤍 Take a deep breath, you're in a safe space now. How are you really feeling today? I'm here to listen to whatever is on your mind.";
    const { wrapper } = createMessageElement(text, "ai");
    chatbox.appendChild(wrapper);
}, 800);

// ==========================================
// --- AUDIO & 3D BACKGROUND ---
// ==========================================
function togglePlayer() { document.getElementById('floating-player').classList.toggle('open'); }

let audioContext, analyser, dataArray, source, isAudioInitialized = false, currentBassPulse = 0;
const audioPlayer = document.getElementById('main-audio');

function initAudio() {
    if (isAudioInitialized) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser(); analyser.fftSize = 256; dataArray = new Uint8Array(analyser.frequencyBinCount);
    source = audioContext.createMediaElementSource(audioPlayer);
    source.connect(analyser); analyser.connect(audioContext.destination); isAudioInitialized = true;
}
audioPlayer.addEventListener('play', () => { initAudio(); if (audioContext && audioContext.state === 'suspended') audioContext.resume(); });

let playlist = [], currentTrackIndex = 0; 
const trackDisplay = document.getElementById('track-display');
const audioStatus = document.getElementById('audio-status');

const fallbackPlaylist = [
    { name: "Cyberpunk Ambient", url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8b8175567.mp3" },
    { name: "Deep Lofi Study", url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3" },
    { name: "Neon Space", url: "https://cdn.pixabay.com/download/audio/2021/08/09/audio_82e88a3854.mp3" }
];

fetch('https://api.github.com/repos/PruthviHG/Mental-Health/contents/Only%20Musics?ref=7067c2c3c6833f9075b5e7a1214a3bce9f7c4346')
    .then(res => { if(!res.ok) throw new Error("GitHub API Rate Limit"); return res.json(); })
    .then(data => {
        if(!Array.isArray(data)) throw new Error("Invalid format");
        playlist = data.filter(f => f.name.endsWith('.mp3') || f.name.endsWith('.wav')).map(f => ({ name: f.name.replace(/\.[^/.]+$/, ""), url: f.download_url }));
        if(playlist.length > 0) loadTrack(0); else throw new Error("Empty Repo");
    })
    .catch(err => {
        console.warn("Using Fallback Audio:", err);
        playlist = fallbackPlaylist;
        audioStatus.innerText = "/// SECURE FALLBACK AUDIO";
        loadTrack(0);
    });

function loadTrack(index) {
    if(!playlist[index]) return;
    audioPlayer.src = playlist[index].url; trackDisplay.innerText = "▶ " + playlist[index].name.substring(0, 25) + "...";
    audioPlayer.play().catch(() => console.log("Waiting for user interaction..."));
}

audioPlayer.addEventListener('ended', () => nextTrack());
document.getElementById('next-btn').addEventListener('click', () => nextTrack());
document.getElementById('prev-btn').addEventListener('click', () => { currentTrackIndex = currentTrackIndex - 1 < 0 ? playlist.length - 1 : currentTrackIndex - 1; loadTrack(currentTrackIndex); });
function nextTrack() { currentTrackIndex = currentTrackIndex + 1 >= playlist.length ? 0 : currentTrackIndex + 1; loadTrack(currentTrackIndex); }

let scene, camera, renderer, particles;
let count = 100000, positions = new Float32Array(count * 3), targetPositions = new Float32Array(count * 3);

function init3D() {
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000); camera.position.z = 5;
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    for (let i = 0; i < count * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 10;
        const theta = Math.random() * Math.PI * 2, phi = Math.acos((Math.random() * 2) - 1), r = 2.5;
        if (i % 3 === 0) targetPositions[i] = r * Math.sin(phi) * Math.cos(theta);
        if (i % 3 === 1) targetPositions[i] = r * Math.sin(phi) * Math.sin(theta);
        if (i % 3 === 2) targetPositions[i] = r * Math.cos(phi);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x45f3ff, size: 0.012, transparent: true, opacity: 0.4 }));
    scene.add(particles);
}

let mouseX = 0, mouseY = 0, isArcadeActive = false;
window.addEventListener('mousemove', (e) => { if(isArcadeActive) return; mouseX = (e.clientX / window.innerWidth - 0.5); mouseY = (e.clientY / window.innerHeight - 0.5); });

function animate3D() {
    requestAnimationFrame(animate3D); 
    if (isAudioInitialized && !audioPlayer.paused) {
        analyser.getByteFrequencyData(dataArray);
        let bassSum = 0; for(let i = 0; i < 10; i++) bassSum += dataArray[i];
        currentBassPulse = ((bassSum / 10) / 255) * 2.0; 
    } else { currentBassPulse = Math.max(0, currentBassPulse - 0.05); }
    
    if(!isArcadeActive) { 
        const posArr = particles.geometry.attributes.position.array; let totalExplosion = currentBassPulse; 
        for (let i = 0; i < count * 3; i++) posArr[i] += ((targetPositions[i] * (1 + totalExplosion)) - posArr[i]) * 0.1;
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y += 0.001 + (currentBassPulse * 0.005); particles.rotation.x += mouseY * 0.02; particles.rotation.z += mouseX * 0.02;
    }
    renderer.render(scene, camera);
}
init3D(); animate3D(); 
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// ==========================================
// --- ARCADE LOGIC (WITH INTRO & YOGA ANIMATIONS) ---
// ==========================================
const modal = document.getElementById('game-modal'), ui = document.getElementById('main-ui'), menu = document.getElementById('arcade-menu'), gameContainer = document.getElementById('game-container'), canvas = document.getElementById('game-canvas'), ctx = canvas.getContext('2d'), gameOverScreen = document.getElementById('game-over-screen'), introScreen = document.getElementById('game-intro-screen');
let gameLoopId, currentGame = null, score = 0, frameCount = 0, isGameOver = false;

let pX = 400, pY = 250, entities = [], bullets = [], bricks = [], sDir = {x: 10, y: 0}, sTrail = [], apple = {x: 200, y: 200}, ball = {x: 400, y: 400, vx: 5, vy: -5, r: 6};
let flowGrid = [], flowPath = [], flowColors = ['#ff003c', '#45f3ff', '#39ff14'], activeColor = null, isDrawing = false;
let hikePlayer = {x: 400, y: 250}, hikeCamera = {x:0, y:0}, hikeItems = [], hikeTrees = [], keys = {w:false, a:false, s:false, d:false, up:false, down:false, left:false, right:false};
let farmGrid = [];

const gameData = {
    'surge':   { title: "NEON SURGE", color: "#45f3ff", btnClass: "btn-surge", desc: "Use your mouse or finger to move your blue core. Dodge the incoming red geometric shapes. Survive as long as possible to increase your score." },
    'snake':   { title: "QUANTUM SNAKE", color: "#39ff14", btnClass: "btn-snake", desc: "Use the Arrow Keys (or WASD) to navigate. Collect the red data nodes to grow your tail and increase your score. Do not crash into the walls or your own tail." },
    'defend':  { title: "PULSE DEFENDER", color: "#ff003c", btnClass: "btn-defend", desc: "You are the center core. Click or tap anywhere on the screen to shoot pulse bullets. Destroy the incoming red anomalies before they reach your center." },
    'breaker': { title: "NEON BREAKER", color: "#ff00ff", btnClass: "btn-breaker", desc: "Move your mouse or finger horizontally to control the bottom paddle. Bounce the ball upward to shatter the glowing bricks. Do not let the ball fall below the paddle." },
    'dash':    { title: "HYPER DASH", color: "#ffaa00", btnClass: "btn-dash", desc: "Move left and right to navigate your ship through the high-speed tunnel. Avoid the red descending barriers at all costs." },
    'flow':    { title: "DATA LINK", color: "#8A2BE2", btnClass: "btn-flow", desc: "Click and drag to draw a continuous line connecting matching colored nodes on the grid. Fill the board to restore the network." },
    'hike':    { title: "ZEN HIKE", color: "#2E8B57", btnClass: "btn-hike", desc: "Use WASD or Arrow Keys to peacefully wander through the infinite digital forest. Collect the glowing blue wisps scattered around the environment." },
    'farm':    { title: "NEON FARM", color: "#DAA520", btnClass: "btn-farm", desc: "Click empty plots to plant digital seeds. Wait patiently as they grow from green to gold. Click the fully grown golden crops to harvest them for points." },
    'breathe': { title: "BOX BREATHING", color: "#00ffcc", btnClass: "btn-breathe", desc: "Find a comfortable position. Follow the expanding and contracting cyan circle. Inhale for 4 seconds, hold for 4 seconds, exhale for 4 seconds, and hold for 4." },
    'yoga':    { title: "DESK YOGA", color: "#ff66b2", btnClass: "btn-yoga", desc: "Follow the on-screen neon avatar. Perform each gentle stretch as indicated to relieve physical tension from long computing sessions. Each pose lasts 10 seconds." }
};

function openArcade() { isArcadeActive = true; modal.style.display = 'flex'; setTimeout(() => modal.style.opacity = '1', 10); ui.style.opacity = '0'; showMenu(); }
function closeArcade() { nukeMemory(); gameOverScreen.style.display = 'none'; modal.style.opacity = '0'; setTimeout(() => modal.style.display = 'none', 500); ui.style.opacity = '1'; isArcadeActive = false; }

function showMenu() { 
    nukeMemory(); 
    gameOverScreen.style.display = 'none'; 
    gameContainer.style.display = 'none'; 
    document.getElementById('arcade-view').style.display = 'flex'; 
    document.getElementById('back-to-menu-btn').style.display = 'none'; 
    document.body.style.cursor = 'default'; 
}

function nukeMemory() { 
    cancelAnimationFrame(gameLoopId); currentGame = null; isGameOver = false; 
    entities = []; bullets = []; sTrail = []; bricks = []; flowGrid = []; hikeItems = []; farmGrid = []; 
    isDrawing = false; activeColor = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
}

function prepareGame(gameId) {
    nukeMemory(); 
    gameOverScreen.style.display = 'none'; 
    document.getElementById('arcade-view').style.display = 'none'; 
    gameContainer.style.display = 'flex'; 
    document.getElementById('back-to-menu-btn').style.display = 'block';
    
    const data = gameData[gameId];
    currentGame = gameId;

    introScreen.style.display = 'flex';
    canvas.style.display = 'none';
    document.getElementById('game-score').style.display = 'none';
    
    document.getElementById('intro-title').innerText = data.title;
    document.getElementById('intro-title').style.color = data.color;
    document.getElementById('intro-desc').innerText = data.desc;
    
    const startBtn = document.getElementById('start-game-btn');
    startBtn.className = `arcade-btn font-mono ${data.btnClass}`;
}

function startGameReal() {
    introScreen.style.display = 'none';
    canvas.style.display = 'block';
    document.getElementById('game-score').style.display = 'block';
    canvas.style.borderColor = gameData[currentGame].color;

    score = 0; frameCount = 0; pX = 400; pY = 250; isGameOver = false;
    
    if(currentGame === 'snake') { sDir = {x: 10, y: 0}; for(let i=0; i<5; i++) sTrail.push({x: pX - i*10, y: pY}); spawnApple(); } 
    else if(currentGame === 'breaker') { ball = {x: 400, y: 300, vx: 5, vy: 5, r: 6}; for(let r=0; r<6; r++) for(let c=0; c<10; c++) bricks.push({x: c*75 + 25, y: r*30 + 30, w: 70, h: 20, active: true}); } 
    else if(currentGame === 'flow') { initFlow(); }
    else if(currentGame === 'hike') { initHike(); }
    else if(currentGame === 'farm') { initFarm(); }
    
    gameLoopId = requestAnimationFrame(gameRouter);
}

function gameOver(customMessage = "SYSTEM FAILURE") { 
    isGameOver = true; cancelAnimationFrame(gameLoopId); 
    document.getElementById('game-over-title').innerText = customMessage; 
    document.getElementById('game-over-title').style.color = gameData[currentGame].color; 
    document.getElementById('final-score').innerText = "FINAL SCORE: " + score; 
    
    const retryBtn = document.getElementById('retry-btn-dynamic');
    retryBtn.className = `arcade-btn font-mono ${gameData[currentGame].btnClass}`;
    
    gameOverScreen.style.display = 'flex'; 
}
function retryGame() { gameOverScreen.style.display = 'none'; startGameReal(); }

function updateGamePointer(clientX, clientY) { 
    if(isGameOver || introScreen.style.display === 'flex') return; 
    const r = canvas.getBoundingClientRect(); 
    pX = (clientX - r.left) * (canvas.width / r.width); 
    pY = (clientY - r.top) * (canvas.height / r.height); 
}

canvas.addEventListener('mousemove', (e) => updateGamePointer(e.clientX, e.clientY));
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); updateGamePointer(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});

function handleCanvasTap(clientX, clientY) {
    if(isGameOver || introScreen.style.display === 'flex') return;
    const r = canvas.getBoundingClientRect();
    const mx = (clientX - r.left) * (canvas.width / r.width);
    const my = (clientY - r.top) * (canvas.height / r.height);
    
    if(currentGame === 'defend') { const angle = Math.atan2(my - 250, mx - 400); bullets.push({x: 400, y: 250, vx: Math.cos(angle)*10, vy: Math.sin(angle)*10}); }
    if(currentGame === 'farm') clickFarm(mx, my);
    if(currentGame === 'flow') { isDrawing = true; pX = mx; pY = my; checkFlowNode(mx, my); }
}

canvas.addEventListener('mousedown', (e) => handleCanvasTap(e.clientX, e.clientY));
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleCanvasTap(e.touches[0].clientX, e.touches[0].clientY); }, {passive: false});
canvas.addEventListener('mouseup', () => { if(currentGame === 'flow') { isDrawing = false; activeColor = null; }});
canvas.addEventListener('touchend', () => { if(currentGame === 'flow') { isDrawing = false; activeColor = null; }});

window.addEventListener('keydown', (e) => { 
    if(isGameOver || !isArcadeActive || introScreen.style.display === 'flex') return; 
    const k = e.key.toLowerCase();
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
        if(k==='w'||k==='arrowup') keys.up = true; if(k==='s'||k==='arrowdown') keys.down = true;
        if(k==='a'||k==='arrowleft') keys.left = true; if(k==='d'||k==='arrowright') keys.right = true;
    }
    if(currentGame === 'snake') {
        if(keys.up && sDir.y === 0) sDir = {x: 0, y: -10}; if(keys.down && sDir.y === 0) sDir = {x: 0, y: 10};
        if(keys.left && sDir.x === 0) sDir = {x: -10, y: 0}; if(keys.right && sDir.x === 0) sDir = {x: 10, y: 0};
    }
});

window.addEventListener('keyup', (e) => { 
    const k = e.key.toLowerCase();
    if(k==='w'||k==='arrowup') keys.up = false; if(k==='s'||k==='arrowdown') keys.down = false;
    if(k==='a'||k==='arrowleft') keys.left = false; if(k==='d'||k==='arrowright') keys.right = false;
});

function gameRouter() {
    if(!currentGame || isGameOver) return; 
    
    if(currentGame === 'hike') { ctx.fillStyle = '#1a2e24'; }
    else if(currentGame === 'farm') { ctx.fillStyle = '#111'; }
    else { ctx.fillStyle = currentGame === 'snake' ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.3)'; }
    ctx.fillRect(0, 0, canvas.width, canvas.height); 
    
    if(currentGame === 'surge') playSurge(); 
    else if(currentGame === 'snake') playSnake(); 
    else if(currentGame === 'defend') playDefend(); 
    else if(currentGame === 'breaker') playBreaker(); 
    else if(currentGame === 'dash') playDash();
    else if(currentGame === 'flow') playFlow(); 
    else if(currentGame === 'hike') playHike(); 
    else if(currentGame === 'farm') playFarm();
    else if(currentGame === 'breathe') playBreathe();
    else if(currentGame === 'yoga') playYoga();

    if (currentGame === 'breathe' || currentGame === 'yoga') {
        document.getElementById('game-score').innerText = "SESSION TIME: " + Math.floor(frameCount / 60) + "s";
    } else {
        document.getElementById('game-score').innerText = "SCORE: " + score; 
    }
    
    if(!isGameOver) { frameCount++; gameLoopId = requestAnimationFrame(gameRouter); }
}

// --- NEW ACTIVITIES ---
function playBreathe() {
    let cycleFrame = frameCount % 960;
    let phase = Math.floor(cycleFrame / 240);
    let progress = (cycleFrame % 240) / 240;
    
    let radius = 50, text = "";
    if(phase === 0) { radius = 50 + (100 * progress); text = "INHALE"; }
    else if(phase === 1) { radius = 150; text = "HOLD"; }
    else if(phase === 2) { radius = 150 - (100 * progress); text = "EXHALE"; }
    else if(phase === 3) { radius = 50; text = "HOLD"; }
    
    ctx.beginPath(); ctx.arc(400, 250, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 255, 204, 0.2)'; ctx.fill();
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2; ctx.stroke();
    
    ctx.fillStyle = '#fff'; ctx.font = '24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 400, 250);
}

const yogaPoses = [
    {name: "NECK ROLLS", desc: "Slowly roll your neck in gentle circles."},
    {name: "SHOULDER SHRUGS", desc: "Lift shoulders to ears, hold, and drop."},
    {name: "WRIST STRETCH", desc: "Extend arm, gently pull fingers back."},
    {name: "SEATED TWIST", desc: "Turn torso to the right, then switch left."},
    {name: "CHEST OPENER", desc: "Clasp hands behind your back and lift."}
];

function drawYogaAvatar(poseIndex, progress, time) {
    ctx.strokeStyle = '#ff66b2'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    let cx = 400, cy = 350; 
    let headY = cy - 120, shoulderY = cy - 80, pelvisY = cy + 20;

    ctx.beginPath();
    ctx.moveTo(cx, pelvisY); ctx.lineTo(cx-40, pelvisY+40); ctx.lineTo(cx-20, pelvisY+50); // Left Leg
    ctx.moveTo(cx, pelvisY); ctx.lineTo(cx+40, pelvisY+40); ctx.lineTo(cx+20, pelvisY+50); // Right Leg
    ctx.moveTo(cx, pelvisY); ctx.lineTo(cx, shoulderY); // Spine

    if (poseIndex === 0) { 
        let hx = cx + Math.cos(time * 0.05) * 15;
        let hy = headY + Math.sin(time * 0.05) * 15;
        ctx.arc(hx, hy, 22, 0, Math.PI*2); 
        ctx.moveTo(cx, shoulderY); ctx.lineTo(cx-30, cy-40); ctx.lineTo(cx-15, cy); 
        ctx.moveTo(cx, shoulderY); ctx.lineTo(cx+30, cy-40); ctx.lineTo(cx+15, cy);
    } 
    else if (poseIndex === 1) { 
        let sY = shoulderY - Math.abs(Math.sin(time * 0.05) * 20);
        ctx.arc(cx, headY, 22, 0, Math.PI*2); 
        ctx.moveTo(cx, sY); ctx.lineTo(cx, sY); 
        ctx.moveTo(cx, sY); ctx.lineTo(cx-35, cy-20); ctx.lineTo(cx-20, cy+20); 
        ctx.moveTo(cx, sY); ctx.lineTo(cx+35, cy-20); ctx.lineTo(cx+20, cy+20);
    } 
    else if (poseIndex === 2) { 
        ctx.arc(cx, headY, 22, 0, Math.PI*2);
        let armSwitch = Math.floor(progress * 2); 
        if (armSwitch === 0) {
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx-90, shoulderY); 
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx+50, shoulderY); ctx.lineTo(cx-80, shoulderY+10); 
        } else {
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx+90, shoulderY); 
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx-50, shoulderY); ctx.lineTo(cx+80, shoulderY+10); 
        }
    } 
    else if (poseIndex === 3) { 
        ctx.arc(cx, headY, 22, 0, Math.PI*2);
        let twistSwitch = Math.floor(progress * 2); 
        if (twistSwitch === 0) {
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx+60, cy-40); ctx.lineTo(cx+40, cy+10); 
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx-40, cy-40); 
        } else {
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx-60, cy-40); ctx.lineTo(cx-40, cy+10); 
            ctx.moveTo(cx, shoulderY); ctx.lineTo(cx+40, cy-40); 
        }
    } 
    else if (poseIndex === 4) { 
        ctx.arc(cx, headY-10, 22, 0, Math.PI*2); 
        ctx.moveTo(cx, shoulderY); ctx.lineTo(cx-40, cy-20); ctx.lineTo(cx-10, cy+30); 
        ctx.moveTo(cx, shoulderY); ctx.lineTo(cx+40, cy-20); ctx.lineTo(cx+10, cy+30); 
    }
    ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
}

function playYoga() {
    let poseDuration = 600; 
    let poseIndex = Math.floor(frameCount / poseDuration) % yogaPoses.length;
    let poseProgress = (frameCount % poseDuration) / poseDuration;
    let pose = yogaPoses[poseIndex];
    
    drawYogaAvatar(poseIndex, poseProgress, frameCount);

    ctx.fillStyle = '#ff66b2'; ctx.font = 'bold 32px monospace'; ctx.textAlign = 'center';
    ctx.fillText(pose.name, 400, 100);
    ctx.fillStyle = '#fff'; ctx.font = '16px monospace';
    ctx.fillText(pose.desc, 400, 140);
    
    ctx.fillStyle = 'rgba(255, 102, 178, 0.2)'; ctx.fillRect(200, 440, 400, 10);
    ctx.fillStyle = '#ff66b2'; ctx.fillRect(200, 440, 400 * poseProgress, 10);
    ctx.font = '12px monospace'; ctx.fillStyle = '#fff';
    ctx.fillText("Next pose in: " + Math.ceil(10 - (poseProgress * 10)) + "s", 400, 470);
}

// --- ARCADE GAMES ---
function playSurge() {
    ctx.beginPath(); ctx.arc(pX, pY, 8, 0, Math.PI * 2); ctx.fillStyle = '#45f3ff'; ctx.shadowBlur = 15; ctx.shadowColor = '#45f3ff'; ctx.fill(); ctx.shadowBlur = 0;
    if(frameCount % 20 === 0) { let size = Math.random() * 20 + 10, x = Math.random() < 0.5 ? -size : 800 + size; entities.push({ x: x, y: Math.random() * 500, s: size, vx: (x < 0 ? 1 : -1) * (Math.random() * 4 + 2 + (score/500)) }); }
    for(let i = entities.length - 1; i >= 0; i--) { let e = entities[i]; e.x += e.vx; ctx.fillStyle = '#ff003c'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff003c'; ctx.fillRect(e.x, e.y, e.s, e.s); ctx.shadowBlur = 0; if(Math.hypot(pX - (e.x + e.s/2), pY - (e.y + e.s/2)) < 8 + e.s/2) { gameOver(); return; } if(e.x < -100 || e.x > 900) entities.splice(i, 1); } score++;
}

function playSnake() {
    if(frameCount % 4 === 0) { pX += sDir.x; pY += sDir.y; sTrail.unshift({x: pX, y: pY}); sTrail.pop(); if(pX < 0 || pX >= 800 || pY < 0 || pY >= 500 || sTrail.slice(1).some(s => s.x === pX && s.y === pY)) { gameOver(); return; } if(Math.abs(pX - apple.x) < 10 && Math.abs(pY - apple.y) < 10) { score += 100; sTrail.push({...sTrail[sTrail.length-1]}); spawnApple(); } }
    ctx.fillStyle = '#ff003c'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff003c'; ctx.fillRect(apple.x, apple.y, 10, 10); ctx.shadowBlur = 0; ctx.fillStyle = '#39ff14'; ctx.shadowBlur = 10; ctx.shadowColor = '#39ff14'; sTrail.forEach(s => ctx.fillRect(s.x, s.y, 10, 10)); ctx.shadowBlur = 0;
}
function spawnApple() { apple = { x: Math.floor(Math.random() * 79) * 10, y: Math.floor(Math.random() * 49) * 10 }; }

function playDefend() {
    ctx.beginPath(); ctx.arc(400, 250, 15, 0, Math.PI * 2); ctx.fillStyle = '#45f3ff'; ctx.shadowBlur = 20; ctx.shadowColor = '#45f3ff'; ctx.fill(); ctx.shadowBlur = 0;
    if(frameCount % 40 === 0) { let angle = Math.random() * Math.PI * 2; entities.push({ x: 400 + Math.cos(angle)*450, y: 250 + Math.sin(angle)*450, angle: angle }); }
    ctx.fillStyle = '#fff'; for(let i = bullets.length - 1; i >= 0; i--) { let b = bullets[i]; b.x += b.vx; b.y += b.vy; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill(); if(b.x < 0 || b.x > 800 || b.y < 0 || b.y > 500) bullets.splice(i, 1); }
    ctx.fillStyle = '#ff003c'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff003c';
    for(let i = entities.length - 1; i >= 0; i--) { let e = entities[i]; e.x -= Math.cos(e.angle) * (1 + score/1000); e.y -= Math.sin(e.angle) * (1 + score/1000); ctx.fillRect(e.x - 10, e.y - 10, 20, 20); if(Math.hypot(e.x - 400, e.y - 250) < 20) { gameOver(); return; } for(let j = bullets.length - 1; j >= 0; j--) { if(Math.hypot(e.x - bullets[j].x, e.y - bullets[j].y) < 15) { score += 50; entities.splice(i, 1); bullets.splice(j, 1); break; } } } ctx.shadowBlur = 0;
}

function playBreaker() {
    let paddleX = Math.max(0, Math.min(800 - 100, pX - 50)); ctx.fillStyle = '#45f3ff'; ctx.shadowBlur = 15; ctx.shadowColor = '#45f3ff'; ctx.fillRect(paddleX, 470, 100, 10); ctx.shadowBlur = 0;
    ball.x += ball.vx; ball.y += ball.vy; if(ball.x - ball.r < 0 || ball.x + ball.r > 800) ball.vx *= -1; if(ball.y - ball.r < 0) ball.vy *= -1; if(ball.y > 500) { gameOver(); return; } 
    if(ball.y + ball.r > 470 && ball.x > paddleX && ball.x < paddleX + 100) { ball.vy = -Math.abs(ball.vy); ball.vx = ((ball.x - (paddleX + 50)) / 50) * 6; }
    ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2); ctx.fillStyle = '#ff00ff'; ctx.shadowBlur = 15; ctx.shadowColor = '#ff00ff'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff00ff'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff00ff'; let activeBricks = 0;
    for(let i=0; i<bricks.length; i++) { let b = bricks[i]; if(b.active) { activeBricks++; ctx.fillRect(b.x, b.y, b.w, b.h); if(ball.x > b.x && ball.x < b.x + b.w && ball.y - ball.r < b.y + b.h && ball.y + ball.r > b.y) { b.active = false; ball.vy *= -1; score += 10; } } } ctx.shadowBlur = 0;
    if(activeBricks === 0) { ball.vx *= 1.2; ball.vy *= 1.2; bricks.forEach(b => b.active = true); } 
}

function playDash() {
    ctx.beginPath(); ctx.moveTo(pX, 450); ctx.lineTo(pX - 15, 480); ctx.lineTo(pX + 15, 480); ctx.closePath(); ctx.fillStyle = '#ffaa00'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffaa00'; ctx.fill(); ctx.shadowBlur = 0;
    if(frameCount % (Math.max(10, 30 - Math.floor(score/100))) === 0) { entities.push({x: Math.random() * 700, y: -20, w: Math.random() * 100 + 50, h: 20}); }
    ctx.fillStyle = '#ff003c'; ctx.shadowBlur = 10; ctx.shadowColor = '#ff003c';
    for(let i = entities.length - 1; i >= 0; i--) { let e = entities[i]; e.y += 5 + (score / 200); ctx.fillRect(e.x, e.y, e.w, e.h); if(pX > e.x && pX < e.x + e.w && 450 < e.y + e.h && 480 > e.y) { gameOver(); return; } if(e.y > 500) entities.splice(i, 1); }
    ctx.shadowBlur = 0; score++;
}

function initFlow() {
    flowGrid = []; flowPath = [];
    let nodes = [ {x: 1, y: 1, c: '#ff003c'}, {x: 5, y: 5, c: '#ff003c'}, {x: 1, y: 5, c: '#45f3ff'}, {x: 5, y: 1, c: '#45f3ff'} ];
    for(let c=0; c<7; c++) {
        flowGrid[c] = [];
        for(let r=0; r<7; r++) { let isNode = nodes.find(n => n.x === c && n.y === r); flowGrid[c][r] = { x: c*70 + 150, y: r*70 + 10, color: isNode ? isNode.c : null, isEnd: !!isNode, pathColor: null }; }
    }
}
function checkFlowNode(mx, my) {
    for(let c=0; c<7; c++) for(let r=0; r<7; r++) { let cell = flowGrid[c][r]; if(Math.hypot(mx - (cell.x+35), my - (cell.y+35)) < 30 && cell.isEnd) { activeColor = cell.color; flowPath = [{c,r}]; } }
}
function playFlow() {
    for(let c=0; c<7; c++) for(let r=0; r<7; r++) {
        let cell = flowGrid[c][r]; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1; ctx.strokeRect(cell.x, cell.y, 70, 70);
        if(cell.isEnd) { ctx.fillStyle = cell.color; ctx.beginPath(); ctx.arc(cell.x+35, cell.y+35, 20, 0, Math.PI*2); ctx.fill(); } else if(cell.pathColor) { ctx.fillStyle = cell.pathColor; ctx.fillRect(cell.x+20, cell.y+20, 30, 30); }
    }
    if(isDrawing && activeColor) {
        let c = Math.floor((pX - 150)/70), r = Math.floor((pY - 10)/70);
        if(c>=0 && c<7 && r>=0 && r<7) {
            let last = flowPath[flowPath.length-1];
            if(last && (Math.abs(last.c - c) + Math.abs(last.r - r) === 1)) { 
                let cell = flowGrid[c][r];
                if(!cell.pathColor || cell.pathColor === activeColor) { if(!cell.isEnd || (cell.isEnd && cell.color === activeColor)) { cell.pathColor = activeColor; flowPath.push({c,r}); score += 5; } }
            }
        }
    }
    if(score > 500) gameOver("NETWORK RESTORED"); 
}

function initHike() { hikePlayer = {x: 400, y: 250}; hikeCamera = {x:0, y:0}; hikeItems = []; hikeTrees = []; for(let i=0; i<100; i++) hikeTrees.push({x: Math.random()*2000 - 600, y: Math.random()*2000 - 600, s: Math.random()*20+20}); for(let i=0; i<20; i++) hikeItems.push({x: Math.random()*1500 - 350, y: Math.random()*1500 - 350, active: true}); }
function playHike() {
    let speed = 3; if(keys.up) hikePlayer.y -= speed; if(keys.down) hikePlayer.y += speed; if(keys.left) hikePlayer.x -= speed; if(keys.right) hikePlayer.x += speed;
    hikeCamera.x += (hikePlayer.x - canvas.width/2 - hikeCamera.x) * 0.1; hikeCamera.y += (hikePlayer.y - canvas.height/2 - hikeCamera.y) * 0.1;
    ctx.save(); ctx.translate(-hikeCamera.x, -hikeCamera.y);
    ctx.fillStyle = '#0a1712'; hikeTrees.forEach(t => { ctx.fillRect(t.x, t.y, t.s, t.s*1.5); });
    ctx.fillStyle = '#45f3ff'; ctx.shadowBlur = 20; ctx.shadowColor = '#45f3ff';
    hikeItems.forEach(i => { if(i.active) { ctx.beginPath(); ctx.arc(i.x, i.y + Math.sin(frameCount*0.05)*5, 5, 0, Math.PI*2); ctx.fill(); if(Math.hypot(hikePlayer.x - i.x, hikePlayer.y - i.y) < 20) { i.active = false; score += 50; } } }); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.fillRect(hikePlayer.x-10, hikePlayer.y-10, 20, 20); ctx.restore();
    if(score >= 1000) gameOver("PEAK REACHED");
}

function initFarm() { farmGrid = []; for(let c=0; c<5; c++) { farmGrid[c] = []; for(let r=0; r<5; r++) { farmGrid[c][r] = { state: 0, timer: 0, x: c*80 + 225, y: r*80 + 50 }; } } }
function clickFarm(mx, my) { for(let c=0; c<5; c++) for(let r=0; r<5; r++) { let cell = farmGrid[c][r]; if(mx > cell.x && mx < cell.x+70 && my > cell.y && my < cell.y+70) { if(cell.state === 0) { cell.state = 1; cell.timer = 0; } else if(cell.state === 2) { cell.state = 0; score += 100; } } } }
function playFarm() {
    for(let c=0; c<5; c++) for(let r=0; r<5; r++) {
        let cell = farmGrid[c][r];
        if(cell.state === 1) { cell.timer++; if(cell.timer > 200) cell.state = 2; ctx.fillStyle = '#2E8B57'; } else if(cell.state === 2) { ctx.fillStyle = '#DAA520'; ctx.shadowBlur = 15; ctx.shadowColor = '#DAA520'; } else { ctx.fillStyle = '#222'; ctx.shadowBlur = 0; } 
        ctx.fillRect(cell.x, cell.y, 70, 70); ctx.shadowBlur = 0;
    }
    if(score >= 2000) gameOver("HARVEST COMPLETE");
}