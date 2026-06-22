import requests
import urllib.parse
from functools import lru_cache

@lru_cache(maxsize=1000)
def cached_search(query):
    clean_query = query.strip()
    if not clean_query:
        return []

    encoded_query = urllib.parse.quote(clean_query)
    first_letter = encoded_query[0].lower() if encoded_query else 'a'
    url = f"https://v3.sg.media-imdb.com/suggestion/{first_letter}/{encoded_query}.json"

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        data = response.json()
        parsed = []

        if 'd' in data:
            for item in data['d']:
                if 'id' in item and item['id'].startswith('tt'):
                    cat = item.get('q', '')
                    
                    # تجاهل الألعاب والبودكاست
                    if cat in ['video game', 'podcast series', 'video']:
                        continue

                    media_type = 'tv' if ('TV' in cat or cat == 'tv mini series') else 'movie'
                    title = item.get('l', 'Unknown')
                    year = item.get('y', 'N/A')

                    # الصور الافتراضية في حال عدم وجود صورة
                    poster = "https://via.placeholder.com/200x300/151a22/8b9bb4?text=No+Poster"
                    backdrop = "https://via.placeholder.com/1280x720/151a22/8b9bb4?text=No+Backdrop"
                    
                    if 'i' in item and 'imageUrl' in item['i']:
                        poster = item['i']['imageUrl']
                        
                        # حيلة برمجية: استخراج الصورة الأصلية عالية الدقة من IMDb لاستخدامها كخلفية للبانر
                        if "._V1_" in poster:
                            backdrop = poster.split("._V1_")[0] + "._V1_.jpg"
                        else:
                            backdrop = poster

                    parsed.append({
                        "id": item['id'],
                        "title": title,
                        "year": str(year),
                        "poster": poster,
                        "backdrop": backdrop,  # الإضافة الجديدة
                        "type": media_type
                    })
                    
        return parsed
    except Exception as e:
        print(f"Search error: {e}")
        return []
