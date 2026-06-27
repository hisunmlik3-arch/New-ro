// ========== إدارة الإصدارات ==========
const CURRENT_VERSION = '3.0.4';
const VERSION_KEY = 'rc-pro-version';
function clearCachesAndReload() {
    if ('caches' in window) caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    window.location.reload(true);
}
(function checkVersion() {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored !== CURRENT_VERSION) { localStorage.setItem(VERSION_KEY, CURRENT_VERSION); clearCachesAndReload(); }
})();

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

// ========== متغيرات عامة وحالة التطبيق ==========
const sandboxRules = 'sandbox="allow-scripts allow-same-origin allow-presentation"';
let currentMediaId = '', currentTitle = '', currentType = '', currentInfoId = '', currentInfoTitle = '', currentInfoType = 'movie';
let isIncognito = false, isListView = false;
let deferredPrompt;

// متغيرات القائمة اللانهائية
window.currentPage = 1;
window.isLoading = false;
window.currentFetchParams = { mode: 'trending', genre: '', type: 'movies', sort: 'desc' };

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

// ========== تهيئة وإضافة زر الترتيب الديناميكي ==========
(function init() {
    if(seasonSelect && episodeSelect) {
        for (let i=1; i<=30; i++) seasonSelect.innerHTML += `<option value="${i}">م ${i}</option>`;
        for (let i=1; i<=100; i++) episodeSelect.innerHTML += `<option value="${i}">ح ${i}</option>`;
    }
    
    // إضافة زر ترتيب الأحدث/الأقدم أوتوماتيكياً بدون لمس HTML
    if (genreFilter && !document.getElementById('sortFilter')) {
        const sortSelect = document.createElement('select');
        sortSelect.id = 'sortFilter';
        sortSelect.innerHTML = '<option value="desc">الأحدث أولاً</option><option value="asc">الأقدم أولاً</option><option value="random">عشوائي</option>';
        sortSelect.style.marginRight = '10px';
        genreFilter.parentNode.insertBefore(sortSelect, genreFilter.nextSibling);
        sortSelect.addEventListener('change', applyFilters);
    }
    
    if(typeFilter) typeFilter.addEventListener('change', applyFilters);
    if(genreFilter) genreFilter.addEventListener('change', applyFilters);
})();

function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }

// ========== ثيم وأوضاع ==========
function applyTheme(m) { document.body.classList.toggle('light-mode', m==='light'); if(themeToggle) themeToggle.textContent = m==='light'?'☀️':'🌙'; localStorage.setItem('theme', m); }
if(themeToggle) themeToggle.onclick = () => applyTheme(document.body.classList.contains('light-mode')?'dark':'light');
applyTheme(localStorage.getItem('theme')||'dark');

if(incognitoToggle) incognitoToggle.onclick = () => { isIncognito = !isIncognito; incognitoToggle.classList.toggle('active', isIncognito); showToast(isIncognito ? '🕶️ الوضع المتخفي مفعّل' : '🕶️ تم إلغاء التخفي'); };
if(viewToggle) viewToggle.onclick = () => { isListView = !isListView; resultsGrid.classList.toggle('list-view', isListView); viewToggle.textContent = isListView ? '⊞' : '⊟'; };

// ========== PWA وملف شخصي ==========
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if(installBtn) installBtn.style.display='flex'; });
if(installBtn) installBtn.onclick = async () => { if(deferredPrompt){ deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; if(r.outcome==='accepted') installBtn.style.display='none'; deferredPrompt=null; } };

if(profileBtn) profileBtn.onclick = () => {
    document.getElementById('statFav').textContent = getFavs().length;
    document.getElementById('statHist').textContent = getHistory().length;
    document.getElementById('statTime').textContent = Math.floor(getHistory().length * 1.5);
    document.getElementById('profileModal').classList.add('active');
};
function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }
function clearAllData() { localStorage.clear(); showToast('🗑️ تم مسح جميع البيانات'); closeProfileModal(); goHome(); }

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
    if(!continueRow) return;
    if(!data.length) { continueRow.innerHTML=''; return; }
    continueRow.innerHTML = data.map(d => `<span class="continue-chip" onclick="playMedia('${d.id}','${d.type}','${d.title.replace(/'/g,"\\'")}',${d.season||1},${d.episode||1})">▶ ${d.title}</span>`).join('');
}
updateContinueRow();

// ========== الجلب الديناميكي والتمرير اللانهائي ==========
function applyFilters() {
    window.currentPage = 1;
    resultsGrid.innerHTML = '';
    const sortVal = document.getElementById('sortFilter') ? document.getElementById('sortFilter').value : 'desc';
    const gVal = genreFilter ? genreFilter.value : '';
    const tVal = typeFilter ? typeFilter.value : 'movies';
    
    window.currentFetchParams = {
        mode: gVal ? 'category' : 'trending',
        genre: gVal,
        type: tVal,
        sort: sortVal
    };
    loadMoreMovies();
}

function goHome() { 
    if(searchInput) searchInput.value=''; 
    if(typeFilter) typeFilter.value='movies'; 
    if(genreFilter) genreFilter.value=''; 
    applyFilters(); 
}

async function loadMoreMovies() {
    if (window.isLoading) return;
    window.isLoading = true;

    const p = window.currentFetchParams;
    let url = p.mode === 'trending' 
        ? `/trending?page=${window.currentPage}&sort=${p.sort}` 
        : `/category?genre=${p.genre}&type=${p.type}&page=${window.currentPage}&sort=${p.sort}`;

    if (window.currentPage === 1) renderSkeletons();

    try {
        const res = await fetch(url); 
        const data = await res.json();
        
        if (window.currentPage === 1) {
            resultsGrid.innerHTML = '';
            if(!data.length) { resultsGrid.innerHTML='<div class="empty-state"><h3>لا توجد بيانات</h3></div>'; window.isLoading = false; return; }
            
            if(p.mode === 'trending' && heroSection) {
                const hero = data[0];
                heroSection.style.backgroundImage = `url('${hero.poster}')`;
                heroSection.style.display = 'block';
                const ht = document.getElementById('heroTitle'); if(ht) ht.textContent = hero.title;
                const hp = document.getElementById('heroPlot'); if(hp) hp.textContent = hero.plot||'';
                const hb = document.getElementById('heroPlayBtn'); if(hb) hb.onclick = () => playMedia(hero.id,hero.type,hero.title);
                data.shift(); // إزالة بطل الصفحة من الشبكة
            } else if(heroSection) {
                heroSection.style.display = 'none';
            }
        }

        if(data.length > 0) {
            if(!window.trendingData) window.trendingData = [];
            window.trendingData = window.trendingData.concat(data);
            
            resultsGrid.insertAdjacentHTML('beforeend', data.map(m => createCardHTML(m.id,m.title,m.poster,m.type,m.year)).join(''));
            attachCardEvents();
            window.currentPage++;
        }
    } catch(e) { 
        if(window.currentPage === 1) resultsGrid.innerHTML='<div class="empty-state"><h3>خطأ في الاتصال</h3></div>'; 
    }
    
    window.isLoading = false;
}

// إنشاء حساس التمرير اللانهائي
const scrollTrigger = document.createElement('div');
scrollTrigger.id = 'scroll-trigger';
scrollTrigger.style.height = '10px';
document.body.appendChild(scrollTrigger);

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !window.isLoading && searchInput.value.trim() === '') {
        loadMoreMovies();
    }
}, { threshold: 0.1 });
observer.observe(scrollTrigger);

function renderSkeletons() { resultsGrid.innerHTML = Array(12).fill('<div class="skeleton-card"><div class="skeleton-anim"></div></div>').join(''); }

// ========== كرت الفيلم ==========
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
        card.querySelector('.party-icon').onclick = (e) => { e.stopPropagation(); currentInfoId = card.dataset.id; currentInfoTitle = card.dataset.title; currentInfoType = card.dataset.type; createWatchParty(); };
        card.querySelector('.fav-icon').onclick = (e) => {
            e.stopPropagation(); let favs = getFavs(); const idx = favs.findIndex(f=>f.id===card.dataset.id); const btn = e.currentTarget;
            if(idx>-1) { favs.splice(idx,1); btn.classList.remove('favorited'); btn.textContent='♡'; showToast('💔 تمت إزالة من المفضلة'); }
            else { favs.push({id:card.dataset.id,title:card.dataset.title,poster:card.dataset.poster,type:card.dataset.type,year:card.dataset.year}); btn.classList.add('favorited'); btn.textContent='♥'; showToast('❤️ أضيف للمفضلة'); }
            saveFavs(favs);
        };
    });
}

// ========== النوافذ والتشغيل ==========
function openInfoModal(card) {
    currentInfoId = card.dataset.id; currentInfoTitle = card.dataset.title; currentInfoType = card.dataset.type;
    document.getElementById('modalTitle').textContent = card.dataset.title;
    document.getElementById('modalYear').textContent = `السنة: ${card.dataset.year}`;
    document.getElementById('modalType').textContent = `النوع: ${card.dataset.type==='movie'?'فيلم':'مسلسل'}`;
    let plot = ''; if(window.trendingData) { const f = window.trendingData.find(m=>m.id===card.dataset.id); if(f&&f.plot) plot=f.plot; }
    document.getElementById('modalPlot').textContent = plot||'لا يوجد ملخص.';
    document.getElementById('modalPoster').src = card.dataset.poster;
    document.getElementById('infoModal').classList.add('active');
}
function closeInfoModal() { document.getElementById('infoModal').classList.remove('active'); }

function createWatchParty() {
    const roomCode = Math.floor(1000 + Math.random() * 9000); 
    const partyUrl = `/party?room=${roomCode}&id=${currentInfoId}&type=${currentInfoType}`;
    if (navigator.clipboard) { navigator.clipboard.writeText(window.location.origin + partyUrl).then(() => showToast('✅ تم نسخ الرابط! جاري الانتقال')).catch(() => showToast('جاري الانتقال...')); } 
    else { showToast('جاري الانتقال لغرفة السينما...'); }
    setTimeout(() => { window.location.href = partyUrl; }, 1500);
}

if(searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout); const q = this.value.trim();
        if(!q) { suggestionsDropdown.style.display='none'; return; }
        searchTimeout = setTimeout(() => {
            fetch(`/search?q=${encodeURIComponent(q)}`).then(r=>r.json()).then(data => {
                if(!data.length) { suggestionsDropdown.style.display='none'; return; }
                suggestionsDropdown.innerHTML = data.slice(0,6).map(m => `<div class="suggestion-item" data-id="${m.id}" data-type="${m.type}" data-title="${m.title.replace(/'/g,"\\'")}">${m.title} (${m.year})</div>`).join('');
                suggestionsDropdown.style.display='block';
                document.querySelectorAll('.suggestion-item').forEach(item => { item.onclick = () => { playMedia(item.dataset.id, item.dataset.type, item.dataset.title); suggestionsDropdown.style.display='none'; searchInput.value=''; }; });
            });
        }, 300);
    });
}
document.addEventListener('click', e => { if(!e.target.closest('.search-container') && suggestionsDropdown) suggestionsDropdown.style.display='none'; });

function checkAndPlay(id, type, title, season = 1, episode = 1) {
    const container = document.getElementById('video-container');
    container.innerHTML = `<div style="text-align:center;padding-top:25vh;"><p style="color:var(--primary);">جاري الاتصال بسيرفر البث...</p></div>`;
    setTimeout(() => {
        const url = type === 'tv' ? `https://streamimdb.ru/embed/tv/${id}/${season}/${episode}` : `https://streamimdb.ru/embed/movie/${id}`;
        container.innerHTML = `<iframe src="${url}" ${sandboxRules} allowfullscreen allow="autoplay; picture-in-picture"></iframe>`;
        saveContinue({id, type, title, season, episode}); updateContinueRow();
        let poster = 'https://via.placeholder.com/200x300/151a22/8b9bb4?text=No+Poster', year = 'N/A';
        const card = document.querySelector(`.movie-card[data-id="${id}"]`);
        if (card) { poster = card.dataset.poster; year = card.dataset.year; } 
        else if (window.trendingData) { const f = window.trendingData.find(m => m.id === id); if (f) { poster = f.poster; year = f.year; } }
        saveHistory({id, title, poster, type, year}); 
        saveProgress(id, type === 'tv' ? Math.floor((parseInt(season)/10)*100) : 100);
    }, 600);
}

function playMedia(id, type, title, season=1, episode=1) {
    currentMediaId=id; currentTitle=title; currentType=type;
    const pt = document.getElementById('player-title'); if(pt) pt.textContent=title;
    const ps = document.getElementById('player-section'); if(ps) ps.style.display='flex';
    const tc = document.getElementById('tv-controls'); if(tc) tc.style.display = type==='tv'?'flex':'none';
    if(type==='tv') { if(seasonSelect) seasonSelect.value=season; if(episodeSelect) episodeSelect.value=episode; }
    checkAndPlay(id,type,title,season,episode);
}

function updateTvEpisode() { checkAndPlay(currentMediaId,'tv',currentTitle, seasonSelect?seasonSelect.value:1, episodeSelect?episodeSelect.value:1); }
function closePlayer() { const ps = document.getElementById('player-section'); if(ps) ps.style.display='none'; const vc = document.getElementById('video-container'); if(vc) vc.innerHTML=''; }

window.trendingData = [];
goHome();
