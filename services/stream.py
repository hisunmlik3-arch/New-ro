import requests
from functools import lru_cache

@lru_cache(maxsize=5000)
def check_stream_cache(media_id, media_type, season='1', episode='1'):
    if not media_id.startswith('tt'): return False

    if media_type == 'tv':
        url = f"https://streamimdb.ru/embed/tv/{media_id}/{season}/{episode}"
    else:
        url = f"https://streamimdb.ru/embed/movie/{media_id}"

    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        resp = requests.get(url, headers=headers, timeout=3)
        
        if resp.status_code == 404: return False
            
        text = resp.text.lower()
        error_indicators = [
            '404 page not found', 'video unavailable', 'video not found',
            'no source', 'source unavailable', 'content unavailable',
            'media unavailable', 'embed not found', 'file not found',
            'acoso escolar', 'invisible (20'
        ]
        
        if any(indicator in text for indicator in error_indicators): return False
        return True
    except Exception as e:
        print(f"Availability check error: {e}")
        return False
