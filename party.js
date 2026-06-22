// ========== إعداد الاتصال ==========
const socket = io('/party');
const video = document.getElementById('videoPlayer');
let isRemoteControl = false;

// ========== اسم المستخدم ==========
let userName = localStorage.getItem('watchparty_name') || 'ضيف';
if (!localStorage.getItem('watchparty_name')) {
    userName = prompt('أدخل اسمك:') || 'ضيف';
    localStorage.setItem('watchparty_name', userName);
}
socket.emit('join', { room: ROOM_ID, name: userName });

// ========== إذا كانت الغرفة تحتوي على فيديو مسبقاً ==========
if (INITIAL_VIDEO_URL && IS_HOST) {
    // المضيف: بث الفيديو للآخرين
    socket.emit('set_video', { room: ROOM_ID, url: INITIAL_VIDEO_URL, title: INITIAL_VIDEO_TITLE });
    loadVideo(INITIAL_VIDEO_URL);
    video.style.display = 'block';
} else if (INITIAL_VIDEO_URL && !IS_HOST) {
    // الضيف: حمّل الفيديو مباشرة
    loadVideo(INITIAL_VIDEO_URL);
    video.style.display = 'block';
}

// ========== استقبال الفيديو من المضيف ==========
socket.on('video_loaded', (data) => {
    loadVideo(data.url);
    video.style.display = 'block';
    const hostControls = document.getElementById('hostControls');
    if (hostControls) hostControls.classList.add('hidden');
});

// ========== استقبال التحكم (مع القفل) ==========
socket.on('control', (data) => {
    isRemoteControl = true;
    if (data.action === 'play') {
        video.currentTime = data.currentTime;
        video.play().then(() => setTimeout(() => isRemoteControl = false, 150));
    } else if (data.action === 'pause') {
        video.currentTime = data.currentTime;
        video.pause();
        isRemoteControl = false;
    } else if (data.action === 'seek') {
        video.currentTime = data.currentTime;
        setTimeout(() => isRemoteControl = false, 200);
    }
});

// ========== إرسال التحكم المحلي ==========
video.addEventListener('play', () => {
    if (!isRemoteControl) socket.emit('control', { room: ROOM_ID, action: 'play', currentTime: video.currentTime });
});
video.addEventListener('pause', () => {
    if (!isRemoteControl) socket.emit('control', { room: ROOM_ID, action: 'pause', currentTime: video.currentTime });
});
video.addEventListener('seeked', () => {
    if (!isRemoteControl) socket.emit('control', { room: ROOM_ID, action: 'seek', currentTime: video.currentTime });
});

// ========== قائمة المستخدمين ==========
socket.on('user_list', (data) => {
    const list = document.getElementById('userList');
    if (list) list.innerHTML = data.users.map(u => `<span class="user-badge">${u}</span>`).join('');
});

// ========== تحميل الفيديو (Proxy + HLS) ==========
function loadVideo(sourceUrl) {
    const proxyUrl = `/stream_video?url=${encodeURIComponent(sourceUrl)}`;

    if (sourceUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
            const hls = new Hls({ maxBufferLength: 30 });
            hls.loadSource(proxyUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = proxyUrl;
            video.play().catch(() => {});
        }
    } else {
        video.src = proxyUrl;
        video.play().catch(() => {});
    }
}

// ========== واجهة المضيف (عند عدم وجود فيديو مسبق) ==========
function loadVideoDirect() {
    const url = document.getElementById('searchInput').value.trim();
    if (!url) return alert('أدخل رابط الفيديو');
    socket.emit('set_video', { room: ROOM_ID, url: url, title: 'رابط مباشر' });
    loadVideo(url);
    video.style.display = 'block';
    const hostControls = document.getElementById('hostControls');
    if (hostControls) hostControls.classList.add('hidden');
}

function copyInvite() {
    navigator.clipboard.writeText(window.location.href).then(() => alert('تم نسخ الرابط'));
}

function leaveParty() {
    socket.emit('leave', { room: ROOM_ID });
    window.location.href = '/';
}
