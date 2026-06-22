import requests
from functools import lru_cache
from services.imdb import cached_search

TRAKT_CLIENT_ID = "7322dbf63e7207d7d0b9a78ad01f41b4790bdef2fa00409cf9c672f12dc30fac"
TRAKT_HEADERS = {
    "Content-Type": "application/json",
    "trakt-api-version": "2",
    "trakt-api-key": TRAKT_CLIENT_ID
}

# الدالة المعدلة: ترجع الآن كلاً من الصورة المصغرة والصورة عالية الدقة
def get_images_for_imdb_id(imdb_id, title):
    default_poster = "https://via.placeholder.com/200x300/151a22/8b9bb4?text=No+Poster"
    default_backdrop = "https://via.placeholder.com/1280x720/151a22/8b9bb4?text=No+Backdrop"
    
    if not title:
        return {"poster": default_poster, "backdrop": default_backdrop}
        
    results = cached_search(title)
    for r in results:
        if r['id'] == imdb_id:
            return {"poster": r.get('poster', default_poster), "backdrop": r.get('backdrop', default_backdrop)}
            
    if results:
        return {"poster": results[0].get('poster', default_poster), "backdrop": results[0].get('backdrop', default_backdrop)}
        
    return {"poster": default_poster, "backdrop": default_backdrop}

@lru_cache(maxsize=50)
def get_trakt_trending(media_type='movies'):
    url = f"https://api.trakt.tv/{media_type}/trending?limit=12&extended=full"
    try:
        resp = requests.get(url, headers=TRAKT_HEADERS, timeout=10)
        data = resp.json()
        items = []
        
        for entry in data:
            item = entry.get('movie' if media_type == 'movies' else 'show')
            if not item:
                continue
                
            title = item.get('title')
            year = item.get('year')
            imdb_id = item.get('ids', {}).get('imdb')
            
            if not imdb_id:
                continue
                
            images = get_images_for_imdb_id(imdb_id, title)
            plot = item.get('overview', '')
            
            items.append({
                "id": imdb_id,
                "title": title,
                "year": str(year) if year else '',
                "poster": images['poster'],
                "backdrop": images['backdrop'],  # الإضافة الجديدة
                "type": 'movie' if media_type == 'movies' else 'tv',
                "plot": plot
            })
            
        return items
    except Exception as e:
        print(f"Trakt trending error: {e}")
        return []

@lru_cache(maxsize=50)
def get_trakt_genre(genre, media_type='movies'):
    url = f"https://api.trakt.tv/{media_type}/popular?limit=15&genres={genre}&extended=full"
    try:
        resp = requests.get(url, headers=TRAKT_HEADERS, timeout=10)
        data = resp.json()
        items = []
        
        for item in data:
            title = item.get('title')
            year = item.get('year')
            imdb_id = item.get('ids', {}).get('imdb')
            
            if not imdb_id:
                continue
                
            images = get_images_for_imdb_id(imdb_id, title)
            plot = item.get('overview', '')
            
            items.append({
                "id": imdb_id,
                "title": title,
                "year": str(year) if year else '',
                "poster": images['poster'],
                "backdrop": images['backdrop'],  # الإضافة الجديدة
                "type": 'movie' if media_type == 'movies' else 'tv',
                "plot": plot
            })
            
        return items
    except Exception as e:
        print(f"Trakt genre error: {e}")
        return []
