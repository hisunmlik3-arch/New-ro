import re, uuid, urllib.parse, cloudscraper, requests
from flask import Blueprint, render_template, request, Response, stream_with_context, jsonify

party_bp = Blueprint('party', __name__, template_folder='../templates')
rooms = {}

# ---------- مصادر محتملة للـ iframe (جرّبها مباشرة) ----------
def get_possible_iframe_srcs(imdb_id, media_type='movie', season=None, episode=None):
    """يولّد روابط iframe محتملة من streamimdb ومواقع أخرى"""
    sources = []
    # أنماط streamimdb
    if media_type == 'tv' and season and episode:
        base = f"/embed/tv/{imdb_id}/{season}/{episode}"
    else:
        base = f"/embed/movie/{imdb_id}"
    sources.append(f"https://streamimdb.ru{base}")            # النمط الأساسي
    sources.append(f"https://streamimdb.ru/player{base}")      # نمط آخر
    sources.append(f"https://vidsrc.to/embed/{media_type}/{imdb_id}")  # vidsrc (قديم)
    sources.append(f"https://2embed.skin/embed/{media_type}/{imdb_id}") # بديل
    sources.append(f"https://www.2embed.to/embed/{media_type}/{imdb_id}")
    return sources

# ---------- استخراج الفيديو من مصدر iframe ----------
def extract_from_iframe(iframe_url):
    """تحاول استخراج رابط فيديو من صفحة iframe"""
    scraper = cloudscraper.create_scraper()
    try:
        resp = scraper.get(iframe_url, timeout=15)
        html = resp.text
        # أنماط روابط الفيديو
        patterns = [
            r'(https?://[^"\s]+\.m3u8[^"\s]*)',
            r'(https?://[^"\s]+\.mp4[^"\s]*)',
            r'file\s*:\s*"(https?://[^"]+)"',
            r'src\s*:\s*"(https?://[^"]+)"',
        ]
        for pattern in patterns:
            match = re.search(pattern, html)
            if match:
                return match.group(1)
        return None
    except Exception as e:
        return None

# ---------- الدالة الموحدة للاستخراج (تجرب عدة مصادر) ----------
def extract_video_url(imdb_id, media_type='movie', season=None, episode=None):
    possible_iframes = get_possible_iframe_srcs(imdb_id, media_type, season, episode)
    for iframe_url in possible_iframes:
        video_url = extract_from_iframe(iframe_url)
        if video_url:
            return video_url
    return None

# ---------- Proxy (كما هو) ----------
@party_bp.route('/stream_video')
def stream_video():
    url = request.args.get('url')
    if not url: return "Missing URL", 400
    headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://streamimdb.ru/', 'Origin': 'https://streamimdb.ru'}
    try:
        resp = requests.get(url, headers=headers, stream=True, timeout=30)
        if '.m3u8' in url:
            content = resp.text
            def replace_segment(match):
                seg = match.group(1)
                if not seg.startswith('http'):
                    base = url.rsplit('/', 1)[0]
                    seg = base + '/' + seg
                return f'/stream_video?url={urllib.parse.quote(seg, safe="")}'
            content = re.sub(r'\n(.*\.(ts|m3u8|mp4|m4s|m4a|m4v))', lambda m: '\n' + replace_segment(m), content)
            return Response(content, mimetype='application/vnd.apple.mpegurl')
        else:
            def generate():
                for chunk in resp.iter_content(chunk_size=1024*1024):
                    yield chunk
            return Response(stream_with_context(generate()), mimetype=resp.headers.get('content-type', 'video/mp4'))
    except Exception as e:
        return f"Proxy error: {e}", 500

# ---------- مسار الاختبار التفصيلي ----------
@party_bp.route('/test_extract')
def test_extract():
    imdb_id = request.args.get('imdb_id', 'tt0111161')
    media_type = request.args.get('type', 'movie')
    season = request.args.get('season')
    episode = request.args.get('episode')

    possible = get_possible_iframe_srcs(imdb_id, media_type, season, episode)
    results = []
    final_url = None
    for url in possible:
        video = extract_from_iframe(url)
        results.append({'iframe_url': url, 'extracted_video': video})
        if video and not final_url:
            final_url = video

    return jsonify({
        'imdb_id': imdb_id,
        'attempts': results,
        'final_url': final_url
    })

# ---------- الغرف (تستخدم extract_video_url الجديدة) ----------
@party_bp.route('/party')
def create_party():
    room_id = request.args.get('room', str(uuid.uuid4())[:8])
    imdb_id = request.args.get('id')
    media_type = request.args.get('type', 'movie')
    season = request.args.get('season')
    episode = request.args.get('episode')

    if room_id not in rooms:
        rooms[room_id] = {'video_url': '', 'title': '', 'users': {}, 'imdb_id': None, 'type': 'movie'}

    if imdb_id:
        video_url = extract_video_url(imdb_id, media_type, season, episode)
        if video_url:
            rooms[room_id]['video_url'] = video_url
            rooms[room_id]['title'] = f"{imdb_id} ({media_type})"
            return render_template('party.html', room_id=room_id, is_host=True,
                                   video_url=video_url, video_title=rooms[room_id]['title'])
        else:
            return render_template('party.html', room_id=room_id, is_host=True,
                                   video_url='', video_title='',
                                   error='تعذر استخراج الفيديو. جرب رابطاً مباشراً (m3u8/mp4).')
    else:
        return render_template('party.html', room_id=room_id, is_host=True, video_url='', video_title='')

@party_bp.route('/party/<room_id>')
def join_party(room_id):
    if room_id not in rooms: return "الغرفة غير موجودة", 404
    return render_template('party.html', room_id=room_id, is_host=False,
                           video_url=rooms[room_id].get('video_url', ''),
                           video_title=rooms[room_id].get('title', ''))

def register_party_events(socketio):
    @socketio.on('join', namespace='/party')
    def handle_join(data):
        room = data['room']; name = data.get('name', 'ضيف')
        from flask_socketio import join_room, emit
        join_room(room)
        if room in rooms:
            rooms[room]['users'][request.sid] = name
            if rooms[room]['video_url']:
                emit('video_loaded', {'url': rooms[room]['video_url'], 'title': rooms[room].get('title', '')}, to=request.sid)
        emit('user_list', {'users': list(rooms[room]['users'].values())}, room=room)

    @socketio.on('set_video', namespace='/party')
    def handle_set_video(data):
        room = data['room']; rooms[room]['video_url'] = data['url']; rooms[room]['title'] = data.get('title', '')
        from flask_socketio import emit
        emit('video_loaded', {'url': data['url'], 'title': data.get('title', '')}, room=room)

    @socketio.on('control', namespace='/party')
    def handle_control(data):
        room = data['room']
        from flask_socketio import emit
        emit('control', {'action': data['action'], 'currentTime': data.get('currentTime', 0), 'from': rooms[room]['users'].get(request.sid, 'شخص')}, room=room, include_self=False)

    @socketio.on('leave', namespace='/party')
    def handle_leave(data):
        room = data['room']
        from flask_socketio import leave_room, emit
        leave_room(room)
        if room in rooms and request.sid in rooms[room]['users']:
            del rooms[room]['users'][request.sid]
        emit('user_list', {'users': list(rooms[room]['users'].values())}, room=room)
