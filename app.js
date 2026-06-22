// ========== إدارة الإصدارات ==========
const CURRENT_VERSION = '3.0.3'; // تحديث الإصدار
const VERSION_KEY = 'rc-pro-version';
function clearCachesAndReload() {
    if ('caches' in window) caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    window.location.reload(true);
}
(function checkVersion() {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== CURRENT_VERSION) { localStorage.setItem(VERSION_KEY, CURRENT_VERSION); clearCachesAndReload(); }
})();

// ========== Service Worker ==========
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                const w = reg.installing;
                w.addEventListener('statechange', () => { if (w.state === 'activated' && navigator.serviceWorker.controller) clearCachesAndReload(); });
            });
        });
    });
}

// ========== متغيرات عامة ==========
const sandboxRules = 'sandbox="allow-scripts allow-same-origin allow-presentation"';
let currentMediaId = '', currentTitle = '', currentType = '', currentInfoId = '', currentInfoTitle = '', currentInfoType = 'movie';
let isIncognito = false, isListView = false;
let deferredPrompt;

// ========== عناصر DOM ==========
const heroSection = document.getElementById('heroSection');
const resultsGrid = document.getElementById('results-grid');
const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');
const themeToggle = document.getElementById('themeToggle');
const installBtn = document.getElementById('installBtn');
const incognitoToggle = document.getElementById('incognitoToggle');
const viewToggle = document.getElementById('viewToggle');
const profileBtn = document.getElementById('profileBtn');
const shareAppBtn = document.getElementById('shareAppBtn');
const continueRow = document.getElementById('continueRow');
const suggestionsDropdown = document.getElementById('suggestionsDropdown');
const searchInput = document.getElementById('search-input');
const typeFilter = document.getElementById('typeFilter');
const genreFilter = document.getElementById('genreFilter');
const toast = document.getElementById('toast');

// ========== تهيئة ==========
(function init() {
    for (let i=1; i<=30; i++) seasonSelect.innerHTML += `<option value="${i}">م ${i}</option>`;
    for (let i=1; i<=100; i++) episodeSelect.innerHTML += `<option value="${i}">ح ${i}</option>`;
})();

function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }

// ========== ثيم ==========
function applyTheme(m) { document.body.classList.toggle('light-mode', m==='light'); themeToggle.textContent = m==='light'?'☀️':'🌙'; localStorage.setItem('theme', m); }
themeToggle.onclick = () => applyTheme(document.body.classList.contains('light-mode')?'dark':'light');
applyTheme(localStorage.getItem('theme')||'dark');

// ========== وضع التخفي ==========
incognitoToggle.onclick = () => { isIncognito = !isIncognito; incognitoToggle.classList.toggle('active', isIncognito); showToast(isIncognito ? '🕶️ الوضع المتخفي مفعّل' : '🕶️ تم إلغاء التخفي'); };

// ========== تغيير العرض ==========
viewToggle.onclick = () => { isListView = !isListView; resultsGrid.classList.toggle('list-view', isListView); viewToggle.textContent = isListView ? '⊞' : '⊟'; };

// ========== PWA ==========
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; installBtn.style.display='flex'; });
installBtn.onclick = async () => { if(deferredPrompt){ deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; if(r.outcome==='accepted') installBtn.style.display='none'; deferredPrompt=null; } };

// ========== ملف شخصي ==========
profileBtn.onclick = () => {
    document.getElementById('statFav').textContent = JSON.parse(localStorage.getItem('favorites')||'[]').length;
    document.getElementById('statHist').textContent = JSON.parse(localStorage.getItem('watchHistory')||'[]').length;
    document.getElementById('statTime').textContent = Math.floor((JSON.parse(localStorage.getItem('watchHistory')||'[]').length * 1.5));
    document.getElementById('profileModal').classList.add('active');
};
function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }
function clearAllData() { localStorage.clear(); showToast('🗑️ تم مسح جميع البيانات'); closeProfileModal(); goHome(); }

// ========== مشاركة ==========
shareAppBtn.onclick = () => { if(navigator.share) navigator.share({title:'Robot Cinema Pro',url:window.location.href}).catch(()=>{}); else { navigator.clipboard.writeText(window.location.href); showToast('🔗 تم نسخ الرابط'); } };
function shareMovie(id, title) { if(navigator.share) navigator.share({title:title,url:`${window.location.origin}/?play=${id}`}).catch(()=>{}); else { navigator.clipboard.writeText(`${window.location.origin}/?play=${id}`); showToast('🔗 تم نسخ رابط الفيلم'); } }

// ========== بيانات محلية ==========
function getFavs() { return JSON.parse(localStorage.getItem('favorites')||'[]'); }
function saveFavs(f) { localStorage.setItem('favorites', JSON.stringify(f)); }
function getHistory() { return JSON.parse(localStorage.getItem('watchHistory')||'[]'); }
function saveHistory(item) { if(isIncognito) return; let h = getHistory().filter(x=>x.id!==item.id); h.unshift(item); if(h.length>50) h.pop(); localStorage.setItem('watchHistory', JSON.stringify(h)); }
function getContinue() { return JSON.parse(localStorage.getItem('continueWatching')||'[]'); }
function saveContinue(item) { let c = getContinue().filter(x=>x.id!==item.id); c.unshift(item); if(c.length>5) c.pop(); localStorage.setItem('continueWatching', JSON.stringify(c)); }
function getProgress(id) { return JSON.parse(localStorage.getItem('progress')||'{}')[id] || 0; }
function saveProgress(id, pct) { let p = JSON.parse(localStorage.getItem('progress')||'{}'); p[id] = pct; localStorage.setItem('progress', JSON.stringify(p)); }

function updateContinueRow() {
    const data = getContinue();
    if(!data.length) { continueRow.innerHTML=''; return; }
    continueRow.innerHTML = data.map(d => `<span class="continue-chip" onclick="playMedia('${d.id}','${d.type}','${d.title.replace(/'/g,"\\'")}',${d.season||1},${d.episode||1})">▶ ${d.title}</span>`).join('');
}
updateContinueRow();

// ========== التنقل ==========
function goHome() { searchInput.value=''; typeFilter.value='movies'; genreFilter.value=''; applyFilters(); }
function showSection(key) {
    heroSection.style.display='none';
    const grid = resultsGrid; grid.innerHTML = '';
    const data = JSON.parse(localStorage.getItem(key)||'[]');
    if(!data.length) { grid.innerHTML = `<div class="empty-state"><h3>${key==='favorites'?'لا توجد مفضلات':'لا يوجد سجل'}</h3></div>`; return; }
    grid.innerHTML = data.map(m => createCardHTML(m.id,m.title,m.poster,m.type,m.year)).join('');
    attachCardEvents();
}

function showBecauseYouWatched() {
    const hist = getHistory();
    if(hist.length < 1) { showToast('⚠️ شاهد فيلماً أولاً'); return; }
    const lastTitles = hist.slice(0,2).map(h => h.title.split(' ').slice(0,2).join(' '));
    Promise.all(lastTitles.map(t => fetch(`/search?q=${encodeURIComponent(t)}`).then(r=>r.json())))
        .then(results => {
            const all = results.flat().filter((v,i,a)=>a.findIndex(t=>t.id===v.id)===i).slice(0,15);
            heroSection.style.display='none';
            resultsGrid.innerHTML = all.map(m => createCardHTML(m.id,m.title,m.poster,m.type,m.year)).join('');
            attachCardEvents();
        });
}

// ========== فلاتر ==========
function applyFilters() {
    const genre = genreFilter.value;
    if(!genre) loadTrending();
    else loadCategory(genre, typeFilter.value);
}

async function loadTrending() {
    renderSkeletons();
    try {
        const res = await fetch('/trending'); const data = await res.json();
        if(!data.length) { resultsGrid.innerHTML='<div class="empty-state"><h3>لا توجد بيانات</h3></div>'; return; }
        window.trendingData = data;
        const hero = data[0];
        heroSection.style.backgroundImage = `url('${hero.poster}')`;
        heroSection.style.display = 'block';
        document.getElementById('heroTitle').textContent = hero.title;
        document.getElementById('heroPlot').textContent = hero.plot||'';
        document.getElementById('heroPlayBtn').onclick = () => playMedia(hero.id,hero.type,hero.title);
        resultsGrid.innerHTML = data.slice(1).map(m => createCardHTML(m.id,m.title,m.poster,m.type,m.year)).join('');
        attachCardEvents();
    } catch(e) { resultsGrid.innerHTML='<div class="empty-state"><h3>خطأ</h3></div>'; }
}

async function loadCategory(genre, type) {
    renderSkeletons();
    try {
        const res = await fetch(`/category?genre=${genre}&type=${type}`); const data = await res.json();
        if(!data.length) { resultsGrid.innerHTML='<div class="empty-state"><h3>لا توجد نتائج</h3></div>'; return; }
        window.trendingData = data;
        heroSection.style.display = 'none';
        resultsGrid.innerHTML = data.map(m => createCardHTML(m.id,m.title,m.poster,m.type,m.year)).join('');
        attachCardEvents();
    } catch(e) { resultsGrid.innerHTML='<div class="empty-state"><h3>خطأ</h3></div>'; }
}

function renderSkeletons() {
    resultsGrid.innerHTML = Array(12).fill('<div class="skeleton-card"><div class="skeleton-anim"></div></div>').join('');
}

// ========== كرت ==========
function createCardHTML(id, title, poster, type, year) {
    const esc = title.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    const isFav = getFavs().some(f=>f.id===id);
    const pct = getProgress(id);
    return `<div class="movie-card" data-id="${id}" data-type="${type}" data-title="${esc}" data-year="${year}" data-poster="${poster}">
        <img src="${poster}" loading="lazy" onerror="this.src='https://via.placeholder.com/200x300/151a22/8b9bb4?text=No+Poster'">
        ${pct>0?`<div class="progress-bar" style="width:${pct}%"></div>`:''}
        <button class="info-icon">ℹ</button>
        <button class="share-icon">🔗</button>
        <button class="party-icon" data-action="party">🎬</button>
        <button class="fav-icon ${isFav?'favorited':''}">${isFav?'♥':'♡'}</button>
        <div class="movie-info"><h3>${title}</h3><div class="movie-meta"><span>${year}</span><span class="${type==='movie'?'badge':'badge tv'}">${type==='movie'?'فيلم':'مسلسل'}</span></div></div>
    </div>`;
}

function attachCardEvents() {
    document.querySelectorAll('.movie-card').forEach(card => {
        card.onclick = (e) => { if(!e.target.closest('button')) playMedia(card.dataset.id, card.dataset.type, card.dataset.title); };
        card.querySelector('.info-icon').onclick = (e) => { e.stopPropagation(); openInfoModal(card); };
        card.querySelector('.share-icon').onclick = (e) => { e.stopPropagation(); shareMovie(card.dataset.id, card.dataset.title); };
        // زر غرفة المشاهدة
        card.querySelector('.party-icon').onclick = (e) => {
            e.stopPropagation();
            currentInfoId = card.dataset.id;
            currentInfoTitle = card.dataset.title;
            currentInfoType = card.dataset.type;
            createWatchParty();
        };
        card.querySelector('.fav-icon').onclick = (e) => {
            e.stopPropagation();
            let favs = getFavs(); const idx = favs.findIndex(f=>f.id===card.dataset.id);
            const btn = e.currentTarget;
            if(idx>-1) { favs.splice(idx,1); btn.classList.remove('favorited'); btn.textContent='♡'; showToast('💔 تمت إزالة من المفضلة'); }
            else { favs.push({id:card.dataset.id,title:card.dataset.title,poster:card.dataset.poster,type:card.dataset.type,year:card.dataset.year}); btn.classList.add('favorited'); btn.textContent='♥'; showToast('❤️ أضيف للمفضلة'); }
            saveFavs(favs);
        };
    });
}

// ========== النافذة المنبثقة وغرفة السينما ==========
function openInfoModal(card) {
    currentInfoId = card.dataset.id; 
    currentInfoTitle = card.dataset.title;
    currentInfoType = card.dataset.type;

    document.getElementById('modalTitle').textContent = card.dataset.title;
    document.getElementById('modalYear').textContent = `السنة: ${card.dataset.year}`;
    document.getElementById('modalType').textContent = `النوع: ${card.dataset.type==='movie'?'فيلم':'مسلسل'}`;

    let plot = ''; 
    if(window.trendingData) { 
        const f = window.trendingData.find(m=>m.id===card.dataset.id); 
        if(f&&f.plot) plot=f.plot; 
    }
    document.getElementById('modalPlot').textContent = plot||'لا يوجد ملخص.';
    document.getElementById('modalPoster').src = card.dataset.poster;
    document.getElementById('infoModal').classList.add('active');
}
function closeInfoModal() { document.getElementById('infoModal').classList.remove('active'); }

// الدالة السحرية لإنشاء غرفة السينما
function createWatchParty() {
    const roomCode = Math.floor(1000 + Math.random() * 9000); 
    const partyUrl = `/party?room=${roomCode}&id=${currentInfoId}&type=${currentInfoType}`;
    const fullUrl = window.location.origin + partyUrl;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl).then(() => {
            showToast('✅ تم نسخ الرابط! أرسله لصديقك... جاري الانتقال');
        }).catch(() => {
            showToast('جاري الانتقال لغرفة السينما...');
        });
    } else {
        showToast('جاري الانتقال لغرفة السينما...');
    }

    setTimeout(() => {
        window.location.href = partyUrl;
    }, 1500);
}

// ========== بحث ==========
let searchTimeout;
searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const q = this.value.trim();
    if(!q) { suggestionsDropdown.style.display='none'; return; }
    searchTimeout = setTimeout(() => {
        fetch(`/search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(data => {
            if(!data.length) { suggestionsDropdown.style.display='none'; return; }
            suggestionsDropdown.innerHTML = data.slice(0,6).map(m => `<div class="suggestion-item" data-id="${m.id}" data-type="${m.type}" data-title="${m.title.replace(/'/g,"\\'")}">${m.title} (${m.year})</div>`).join('');
            suggestionsDropdown.style.display='block';
            document.querySelectorAll('.suggestion-item').forEach(item => {
                item.onclick = () => { playMedia(item.dataset.id, item.dataset.type, item.dataset.title); suggestionsDropdown.style.display='none'; searchInput.value=''; };
            });
        });
    }, 300);
});
document.addEventListener('click', e => { if(!e.target.closest('.search-container')) suggestionsDropdown.style.display='none'; });

function searchMedia() {
    const q = searchInput.value.trim(); if(!q) return;
    suggestionsDropdown.style.display='none'; heroSection.style.display='none';
    renderSkeletons();
    fetch(`/search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(data => {
        if(!data.length) { resultsGrid.innerHTML='<div class="empty-state"><h3>لم نجد شيئاً 💔</h3></div>'; return; }
        resultsGrid.innerHTML = data.map(m => createCardHTML(m.id,m.title,m.poster,m.type,m.year)).join('');
        attachCardEvents();
    }).catch(() => { resultsGrid.innerHTML='<div class="empty-state"><h3>خطأ</h3></div>'; });
}

// ========== تشغيل ==========
function checkAndPlay(id, type, title, season = 1, episode = 1) {
    const container = document.getElementById('video-container');
    container.innerHTML = `<div style="text-align:center;padding-top:25vh;"><div class="spinner" style="width:40px;height:40px;border:4px solid rgba(0,229,255,0.1);border-top-color:var(--primary);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div><p style="color:var(--primary);margin-top:15px;">جاري الاتصال بسيرفر البث...</p></div>`;

    setTimeout(() => {
        const url = type === 'tv' 
            ? `https://streamimdb.ru/embed/tv/${id}/${season}/${episode}` 
            : `https://streamimdb.ru/embed/movie/${id}`;

        container.innerHTML = `<iframe src="${url}" ${sandboxRules} allowfullscreen allow="autoplay; picture-in-picture"></iframe>`;

        saveContinue({id, type, title, season, episode}); 
        updateContinueRow();

        const card = document.querySelector(`.movie-card[data-id="${id}"]`);
        let poster = 'https://via.placeholder.com/200x300/151a22/8b9bb4?text=No+Poster';
        let year = 'N/A';

        if (card) {
            poster = card.dataset.poster;
            year = card.dataset.year;
        } else if (window.trendingData && window.trendingData.length > 0) {
            const found = window.trendingData.find(m => m.id === id);
            if (found) { poster = found.poster; year = found.year; }
        }

        saveHistory({id, title, poster, type, year}); 
        saveProgress(id, type === 'tv' ? Math.floor((parseInt(season)/10)*100) : 100);

    }, 600);
}

function playMedia(id, type, title, season=1, episode=1) {
    currentMediaId=id; currentTitle=title; currentType=type;
    document.getElementById('player-title').textContent=title;
    document.getElementById('player-section').style.display='flex';
    document.getElementById('tv-controls').style.display = type==='tv'?'flex':'none';
    if(type==='tv') { seasonSelect.value=season; episodeSelect.value=episode; }
    checkAndPlay(id,type,title,season,episode);
}

function updateTvEpisode() { checkAndPlay(currentMediaId,'tv',currentTitle, seasonSelect.value, episodeSelect.value); }
function closePlayer() { document.getElementById('player-section').style.display='none'; document.getElementById('video-container').innerHTML=''; }

function showUnavailableModal(title, type, failedId) {
    closePlayer();
    document.getElementById('unavailableMessage').textContent = `"${title}" غير متوفر حالياً.`;
    document.getElementById('unavailableModal').classList.add('active');
    const grid = document.getElementById('suggestionsGrid');
    grid.innerHTML = '<p>جارٍ تحميل الاقتراحات...</p>';
    fetch(`/search?q=${encodeURIComponent(title.split(' ').slice(0,2).join(' '))}`).then(r=>r.json()).then(data => {
        const f = data.filter(m=>m.id!==failedId).slice(0,6);
        const items = f.length ? f : (window.trendingData||[]).filter(m=>m.id!==failedId).slice(0,6);
        grid.innerHTML = items.length ? items.map(m => `<div class="suggestion-card" onclick="closeUnavailableModal();playMedia('${m.id}','${m.type}','${m.title.replace(/'/g,"\\'")}')"><img src="${m.poster}" onerror="this.src='https://via.placeholder.com/200x300/151a22/8b9bb4?text=No+Poster'"><div class="title">${m.title}</div></div>`).join('') : '<p>لا توجد اقتراحات.</p>';
    });
}
function closeUnavailableModal() { document.getElementById('unavailableModal').classList.remove('active'); }

window.trendingData = [];
goHome();
