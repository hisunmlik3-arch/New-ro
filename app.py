import random
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO
from services.imdb import cached_search
from services.trakt import get_trakt_trending, get_trakt_genre
from services.stream import check_stream_cache

# استيراد Blueprint ودالة تسجيل الأحداث من ملف الحفلة
from services.party import party_bp, register_party_events

app = Flask(__name__)
APP_VERSION = "3.0.2"
app.config['SECRET_KEY'] = 'your-secret-key-here'  # مطلوب لـ Flask-SocketIO

# تسجيل Blueprint الخاص بـ Watch Party (يحتوي على /party و /stream_video)
app.register_blueprint(party_bp)

# إعداد SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# ربط أحداث الغرف (join, control, etc.)
register_party_events(socketio)

# ---------- الروابط الرئيسية ----------
@app.route('/')
def home():
    return render_template('index.html', version=APP_VERSION)

@app.route('/search')
def search():
    q = request.args.get('q', '')
    if not q:
        return jsonify([])
    return jsonify(cached_search(q))

@app.route('/trending')
def trending():
    movies = get_trakt_trending('movies')
    shows = get_trakt_trending('shows')
    combined = movies + shows
    random.shuffle(combined)
    return jsonify(combined[:15])

@app.route('/category')
def category():
    genre = request.args.get('genre', 'action').lower()
    media_type = request.args.get('type', 'movies').lower()
    return jsonify(get_trakt_genre(genre, media_type))

@app.route('/check_availability')
def check_availability():
    media_id = request.args.get('id', '')
    media_type = request.args.get('type', 'movie')
    season = request.args.get('s', '1')
    episode = request.args.get('e', '1')
    is_available = check_stream_cache(media_id, media_type, season, episode)
    return jsonify({"available": is_available})

@app.route('/manifest.json')
def manifest():
    return jsonify({
        "name": "Robot Cinema Pro", "short_name": "R Cinema",
        "description": "منصة السينما الأولى", "start_url": "/",
        "display": "standalone", "background_color": "#090a0f",
        "theme_color": "#00e5ff", "orientation": "portrait-primary",
        "icons": [{"src": "https://cdn-icons-png.flaticon.com/512/3658/3658959.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]
    })

@app.route('/sw.js')
def service_worker():
    sw_js = f"const CACHE_NAME='rc-pro-{APP_VERSION}'; self.addEventListener('install',e=>{{self.skipWaiting();}}); self.addEventListener('activate',e=>{{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))); self.clients.claim();}}); self.addEventListener('fetch',e=>{{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));}});"
    return app.response_class(sw_js, mimetype='application/javascript')

@app.route('/ping')
def ping():
    return "I am awake!", 200
