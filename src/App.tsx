import { useState, useEffect, useRef } from 'react';
import { 
  Search, Film, Heart, Play, X, Info, Share2, Sun, Moon, Grid, List, Clock, Star, Users, 
  ChevronLeft, ChevronRight, TrendingUp, Zap, BookmarkPlus, Download, Award, 
  Sparkles, Shuffle, BarChart3, Settings, Languages, PlayCircle, Flame, Target, Loader
} from 'lucide-react';

// Types
interface MediaItem {
  id: string;
  title: string;
  year: string;
  poster: string;
  backdrop?: string;
  type: 'movie' | 'tv';
  plot?: string;
  rating?: number;
  genres?: string[];
  cast?: string[];
}

interface WatchProgress {
  [key: string]: number;
}

interface WatchHistory {
  id: string;
  timestamp: number;
  progress: number;
}

interface Playlist {
  id: string;
  name: string;
  items: string[];
  emoji: string;
}

// TMDB API Configuration
const TMDB_API_KEY = '8d6d91941230817f7807d643736e8a49';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Mock data for initial trending
const TRENDING_MOVIES: MediaItem[] = [
  {
    id: 'tt15398776',
    title: 'Oppenheimer',
    year: '2023',
    poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    type: 'movie',
    plot: 'قصة العالم الأمريكي روبرت أوبنهايمر ودوره في تطوير القنبلة الذرية.',
    rating: 8.5,
    genres: ['دراما', 'تاريخ'],
    cast: ['كيليان مورفي', 'روبرت داوني جونيور', 'إميلي بلانت']
  },
  {
    id: 'tt1517268',
    title: 'Barbie',
    year: '2023',
    poster: 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/ctMserH8g2SeOAnCw5gFjdQF8mo.jpg',
    type: 'movie',
    plot: 'باربي وكين يقضيان أفضل وقت في عالم باربي لاند.',
    rating: 7.2,
    genres: ['كوميديا', 'مغامرة'],
    cast: ['مارجو روبي', 'رايان جوزلينج']
  },
  {
    id: 'tt0111161',
    title: 'The Shawshank Redemption',
    year: '1994',
    poster: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/kXfqcdQKsToO0OUXHcrrNCHDBzO.jpg',
    type: 'movie',
    plot: 'رجلان مسجونان يرتبطان على مدى عدة سنوات.',
    rating: 9.3,
    genres: ['دراما'],
    cast: ['تيم روبينز', 'مورجان فريمان']
  },
  {
    id: 'tt0468569',
    title: 'The Dark Knight',
    year: '2008',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg',
    type: 'movie',
    plot: 'باتمان يواجه الجوكر، عقل إجرامي مدبر.',
    rating: 9.0,
    genres: ['أكشن', 'جريمة'],
    cast: ['كريستيان بيل', 'هيث ليدجر', 'آرون إيكهارت']
  },
  {
    id: 'tt0944947',
    title: 'Game of Thrones',
    year: '2011',
    poster: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/suopoADq0k8YZr4dQXcU6pToj6s.jpg',
    type: 'tv',
    plot: 'تسع عائلات نبيلة تتقاتل للسيطرة على أرض ويستروس الأسطورية.',
    rating: 9.2,
    genres: ['دراما', 'مغامرة', 'فانتازيا'],
    cast: ['إيميليا كلارك', 'كيت هارينغتون', 'بيتر دينكلاج']
  },
  {
    id: 'tt1190634',
    title: 'The Boys',
    year: '2019',
    poster: 'https://image.tmdb.org/t/p/w500/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/mGVrXeIjyecj6TKmwPVpHlscEmw.jpg',
    type: 'tv',
    plot: 'مجموعة من الحراس يحاربون الأبطال الخارقين الفاسدين.',
    rating: 8.7,
    genres: ['أكشن', 'خيال علمي'],
    cast: ['كارل أوربان', 'جاك كواد', 'أنتوني ستار']
  }
];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [watchProgress, setWatchProgress] = useState<WatchProgress>({});
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [playerMedia, setPlayerMedia] = useState<MediaItem | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [partyRoom, setPartyRoom] = useState('');
  const [movies, setMovies] = useState<MediaItem[]>(TRENDING_MOVIES);
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [heroMedia] = useState<MediaItem>(TRENDING_MOVIES[0]);
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { id: '1', name: 'أفلامي المفضلة', items: [], emoji: '🎬' },
    { id: '2', name: 'لمشاهدتها لاحقاً', items: [], emoji: '⏰' },
    { id: '3', name: 'أفلام الأكشن', items: [], emoji: '💥' }
  ]);
  const [activeTab, setActiveTab] = useState<'trending' | 'recommended' | 'playlists'>('trending');
  
  // TV Show Controls
  const [currentSeason, setCurrentSeason] = useState(1);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [maxSeasons] = useState(8);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [subtitleLang, setSubtitleLang] = useState('ar');
  const [showPlayerSettings, setShowPlayerSettings] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLIFrameElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const savedFavorites = localStorage.getItem('favorites');
    const savedProgress = localStorage.getItem('watchProgress');
    const savedHistory = localStorage.getItem('watchHistory');
    const savedPlaylists = localStorage.getItem('playlists');
    const savedTheme = localStorage.getItem('darkMode');
    
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedProgress) setWatchProgress(JSON.parse(savedProgress));
    if (savedHistory) setWatchHistory(JSON.parse(savedHistory));
    if (savedPlaylists) setPlaylists(JSON.parse(savedPlaylists));
    if (savedTheme !== null) setDarkMode(savedTheme === 'true');
    
    // Load trending on start
    loadTrendingContent();
  }, []);

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('watchProgress', JSON.stringify(watchProgress));
  }, [watchProgress]);

  useEffect(() => {
    localStorage.setItem('watchHistory', JSON.stringify(watchHistory));
  }, [watchHistory]);

  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    if (playerMedia?.type === 'tv') {
      setCurrentSeason(1);
      setCurrentEpisode(1);
    }
  }, [playerMedia]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && playerMedia) {
        setPlayerMedia(null);
      }
      if (e.key === '/' && !playerMedia) {
        e.preventDefault();
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        input?.focus();
      }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        input?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playerMedia]);

  // Load trending content from TMDB
  const loadTrendingContent = async () => {
    try {
      const [moviesRes, tvRes] = await Promise.all([
        fetch(`${TMDB_BASE_URL}/trending/movie/week?api_key=${TMDB_API_KEY}&language=ar`),
        fetch(`${TMDB_BASE_URL}/trending/tv/week?api_key=${TMDB_API_KEY}&language=ar`)
      ]);

      const moviesData = await moviesRes.json();
      const tvData = await tvRes.json();

      const combinedResults = [
        ...moviesData.results.slice(0, 10).map((m: any) => tmdbToMediaItem(m, 'movie')),
        ...tvData.results.slice(0, 6).map((t: any) => tmdbToMediaItem(t, 'tv'))
      ];

      setMovies(combinedResults);
    } catch (error) {
      console.error('Error loading trending:', error);
      setMovies(TRENDING_MOVIES);
    }
  };

  // Convert TMDB data to MediaItem
  const tmdbToMediaItem = (item: any, type: 'movie' | 'tv'): MediaItem => {
    return {
      id: item.imdb_id || `tmdb_${item.id}`,
      title: item.title || item.name,
      year: (item.release_date || item.first_air_date || '').split('-')[0] || 'N/A',
      poster: item.poster_path ? `${TMDB_IMAGE_BASE}/w500${item.poster_path}` : 'https://via.placeholder.com/500x750/1a1a1a/666?text=No+Poster',
      backdrop: item.backdrop_path ? `${TMDB_IMAGE_BASE}/original${item.backdrop_path}` : undefined,
      type,
      plot: item.overview || 'لا يوجد وصف متاح',
      rating: item.vote_average ? parseFloat(item.vote_average.toFixed(1)) : undefined,
      genres: []
    };
  };

  // Get IMDb ID from TMDB
  const getImdbId = async (tmdbId: string, type: 'movie' | 'tv'): Promise<string> => {
    try {
      const endpoint = type === 'movie' ? 'movie' : 'tv';
      const res = await fetch(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`);
      const data = await res.json();
      return data.imdb_id || `tmdb_${tmdbId}`;
    } catch (error) {
      return `tmdb_${tmdbId}`;
    }
  };

  // Search in TMDB
  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch(
        `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`
      );
      const data = await res.json();

      console.log('TMDB Search Results:', data);

      if (!data.results || data.results.length === 0) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      const results = await Promise.all(
        data.results
          .filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 20)
          .map(async (item: any) => {
            const type = item.media_type as 'movie' | 'tv';
            const mediaItem = tmdbToMediaItem(item, type);
            
            // Try to get IMDb ID
            if (item.id) {
              try {
                const imdbId = await getImdbId(item.id, type);
                mediaItem.id = imdbId;
              } catch (e) {
                console.warn('Failed to get IMDb ID for:', item.title || item.name);
              }
            }
            
            return mediaItem;
          })
      );

      console.log('Processed results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const handleSearch = async () => {
      if (searchQuery.trim()) {
        await searchTMDB(searchQuery);
      } else {
        setSearchResults([]);
      }
    };

    searchTimeoutRef.current = setTimeout(handleSearch, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const filteredMovies = searchQuery.trim() 
    ? searchResults.filter(movie => mediaType === 'all' || movie.type === mediaType)
    : movies.filter(movie => mediaType === 'all' || movie.type === mediaType);

  const continueWatching = movies.filter(m => watchProgress[m.id] && watchProgress[m.id] > 5 && watchProgress[m.id] < 95);

  const getRecommendations = () => {
    const watchedIds = Object.keys(watchProgress);
    if (watchedIds.length === 0) return movies.slice(0, 6);
    
    const lastWatched = movies.find(m => m.id === watchedIds[watchedIds.length - 1]);
    if (!lastWatched) return movies.slice(0, 6);
    
    return movies.filter(m => 
      m.genres?.some(g => lastWatched.genres?.includes(g)) && m.id !== lastWatched.id
    ).slice(0, 6);
  };

  const getStats = () => {
    const totalWatched = Object.keys(watchProgress).length;
    const totalTime = totalWatched * 90;
    const favoriteGenres = [...new Set(
      movies.filter(m => favorites.includes(m.id))
        .flatMap(m => m.genres || [])
    )];
    
    return {
      totalWatched,
      totalHours: Math.floor(totalTime / 60),
      favoriteCount: favorites.length,
      favoriteGenres: favoriteGenres.slice(0, 3)
    };
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const addToPlaylist = (mediaId: string, playlistId: string): void => {
    setPlaylists(prev => prev.map(pl => 
      pl.id === playlistId && !pl.items.includes(mediaId)
        ? { ...pl, items: [...pl.items, mediaId] }
        : pl
    ));
    showToast('✅ تمت الإضافة إلى القائمة');
  };

  const createPlaylist = (name: string, emoji: string) => {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      items: [],
      emoji
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    showToast('✅ تم إنشاء القائمة');
  };

  const getStreamUrl = (media: MediaItem, season?: number, episode?: number) => {
    // Extract IMDb ID or TMDB ID
    const id = media.id.startsWith('tmdb_') ? media.id.replace('tmdb_', '') : media.id;
    
    if (media.type === 'tv') {
      return `https://streamimdb.ru/embed/tv/${id}/${season || 1}/${episode || 1}`;
    }
    return `https://streamimdb.ru/embed/movie/${id}`;
  };

  const playMedia = (media: MediaItem) => {
    setPlayerMedia(media);
    const now = Date.now();
    
    setWatchHistory(prev => {
      const filtered = prev.filter(h => h.id !== media.id);
      return [{ id: media.id, timestamp: now, progress: 0 }, ...filtered].slice(0, 20);
    });
    
    if (!watchProgress[media.id]) {
      setWatchProgress(prev => ({ ...prev, [media.id]: 10 }));
    }
  };

  const playRandomMedia = () => {
    const randomIndex = Math.floor(Math.random() * filteredMovies.length);
    playMedia(filteredMovies[randomIndex]);
  };

  const shareMedia = (media: MediaItem) => {
    const url = `${window.location.origin}?id=${media.id}`;
    if (navigator.share) {
      navigator.share({ title: media.title, url });
    } else {
      navigator.clipboard.writeText(url);
      showToast('✅ تم نسخ الرابط!');
    }
  };

  const createPartyRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 10);
    setPartyRoom(roomId);
    showToast(`🎉 غرفة الحفلة: ${roomId}`);
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = `fixed top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-6 py-3 rounded-full font-bold z-[2000] shadow-2xl transition-all`;
    toast.textContent = message;
    toast.style.opacity = '0';
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  const getSimilarContent = (media: MediaItem) => {
    return movies.filter(m => 
      m.id !== media.id && 
      m.type === media.type &&
      m.genres?.some(g => media.genres?.includes(g))
    ).slice(0, 4);
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-[#090a0f] text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-colors ${darkMode ? 'bg-[#090a0f]/90 border-white/5' : 'bg-white/90 border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight flex items-center gap-2">
              <div className="relative">
                <Film className="w-7 h-7 text-cyan-400" />
                <Sparkles className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              روبوت سينما
            </h1>
            
            <div className="flex gap-2 items-center">
              <button
                onClick={playRandomMedia}
                className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/30"
                title="فيلم عشوائي"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowStatsModal(true)}
                className={`p-2 rounded-full border transition-all ${darkMode ? 'bg-gray-800 border-white/10 hover:border-cyan-400' : 'bg-white border-gray-200 hover:border-cyan-500'}`}
                title="الإحصائيات"
              >
                <BarChart3 className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowPlaylistModal(true)}
                className={`p-2 rounded-full border transition-all ${darkMode ? 'bg-gray-800 border-white/10 hover:border-cyan-400' : 'bg-white border-gray-200 hover:border-cyan-500'}`}
                title="قوائم التشغيل"
              >
                <BookmarkPlus className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowPartyModal(true)}
                className={`p-2 rounded-full border transition-all relative ${darkMode ? 'bg-gray-800 border-white/10 hover:border-cyan-400' : 'bg-white border-gray-200 hover:border-cyan-500'}`}
                title="المشاهدة الجماعية"
              >
                <Users className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              </button>

              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full border transition-all ${darkMode ? 'bg-gray-800 border-white/10 hover:border-cyan-400' : 'bg-white border-gray-200 hover:border-cyan-500'}`}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className={`p-2 rounded-full border transition-all ${darkMode ? 'bg-gray-800 border-white/10 hover:border-cyan-400' : 'bg-white border-gray-200 hover:border-cyan-500'}`}
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Search */}
          <div ref={searchRef} className="relative mb-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                {isSearching && (
                  <Loader className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 animate-spin" />
                )}
                <input
                  type="text"
                  placeholder="ابحث عن أي فيلم أو مسلسل... (Rush, Breaking Bad, Spider-Man...)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(e.target.value.length > 0);
                  }}
                  className={`w-full pl-12 pr-12 py-3 rounded-full border outline-none transition-all ${darkMode ? 'bg-gray-800 border-white/10 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20' : 'bg-white border-gray-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'}`}
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-3 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            {showSuggestions && searchQuery && (
              <div className={`absolute top-full left-0 right-0 mt-2 rounded-2xl border overflow-hidden z-50 max-h-96 overflow-y-auto shadow-2xl ${darkMode ? 'bg-gray-800 border-white/10' : 'bg-white border-gray-200'}`}>
                {isSearching ? (
                  <div className="px-4 py-8 text-center">
                    <Loader className="w-8 h-8 mx-auto text-cyan-400 animate-spin mb-2" />
                    <p className="text-sm text-gray-400">جاري البحث...</p>
                  </div>
                ) : searchResults.length > 0 ? (
                  searchResults.slice(0, 8).map(movie => (
                    <div
                      key={movie.id}
                      onClick={() => {
                        setSelectedMedia(movie);
                        setShowSuggestions(false);
                      }}
                      className={`px-4 py-3 cursor-pointer border-b transition-colors flex items-center gap-3 hover:bg-cyan-400/10 ${darkMode ? 'border-white/10' : 'border-gray-100'}`}
                    >
                      <img src={movie.poster} alt={movie.title} className="w-12 h-16 object-cover rounded shadow-lg" />
                      <div className="flex-1">
                        <div className="font-medium">{movie.title}</div>
                        <div className="text-sm text-gray-400 flex items-center gap-2 flex-wrap">
                          <span>{movie.year}</span>
                          <span>•</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${movie.type === 'tv' ? 'bg-red-500' : 'bg-cyan-400 text-black'}`}>
                            {movie.type === 'tv' ? 'مسلسل' : 'فيلم'}
                          </span>
                          {movie.rating && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                {movie.rating}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playMedia(movie);
                          setShowSuggestions(false);
                        }}
                        className="p-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg"
                      >
                        <Play className="w-4 h-4 fill-white text-white" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-gray-400">
                    <p className="text-sm">لم يتم العثور على نتائج</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Continue Watching */}
          {continueWatching.length > 0 && !searchQuery && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-cyan-400">استكمل المشاهدة</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {continueWatching.slice(0, 5).map(media => (
                  <button
                    key={media.id}
                    onClick={() => playMedia(media)}
                    className={`relative flex-shrink-0 transition-all hover:scale-105 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl overflow-hidden shadow-lg`}
                    style={{ width: '120px' }}
                  >
                    <img src={media.poster} alt={media.title} className="w-full h-40 object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${watchProgress[media.id]}%` }}></div>
                    </div>
                    <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full text-xs">
                      {Math.round(watchProgress[media.id])}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setMediaType('all')}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-1 ${mediaType === 'all' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' : darkMode ? 'bg-gray-800 border border-white/10' : 'bg-white border border-gray-200'}`}
            >
              <Zap className="w-4 h-4" />
              الكل
            </button>
            <button
              onClick={() => setMediaType('movie')}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-1 ${mediaType === 'movie' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' : darkMode ? 'bg-gray-800 border border-white/10' : 'bg-white border border-gray-200'}`}
            >
              <Film className="w-4 h-4" />
              أفلام
            </button>
            <button
              onClick={() => setMediaType('tv')}
              className={`px-4 py-2 rounded-full font-medium text-sm transition-all flex items-center gap-1 ${mediaType === 'tv' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg' : darkMode ? 'bg-gray-800 border border-white/10' : 'bg-white border border-gray-200'}`}
            >
              <Star className="w-4 h-4" />
              مسلسلات
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      {!searchQuery && heroMedia && (
        <div
          className="relative w-full h-[50vh] min-h-[300px] max-h-[500px] mx-4 my-4 rounded-2xl overflow-hidden shadow-2xl group"
          style={{
            backgroundImage: `url(${heroMedia.backdrop || heroMedia.poster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/50 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#090a0f]/80 to-transparent"></div>
          
          <div className="absolute top-6 left-6 flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 rounded-full text-white font-bold shadow-lg">
            <TrendingUp className="w-5 h-5" />
            <span>الأكثر مشاهدة</span>
          </div>

          <div className="absolute bottom-6 left-6 right-6 z-10">
            <div className="flex items-center gap-2 mb-2">
              {heroMedia.genres?.map(genre => (
                <span key={genre} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                  {genre}
                </span>
              ))}
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-3 drop-shadow-2xl">{heroMedia.title}</h2>
            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold">{heroMedia.rating}</span>
              </div>
              <span className="text-gray-300">{heroMedia.year}</span>
              <span className="px-3 py-1 bg-cyan-400/20 border border-cyan-400 rounded-full text-cyan-400 text-sm font-bold">
                {heroMedia.type === 'movie' ? 'فيلم' : 'مسلسل'}
              </span>
            </div>
            <p className="text-sm text-gray-200 mb-4 line-clamp-2 max-w-2xl">{heroMedia.plot}</p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => playMedia(heroMedia)}
                className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:from-cyan-500 hover:to-blue-600 transition-all shadow-2xl shadow-cyan-500/40 hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current" />
                تشغيل الآن
              </button>
              <button
                onClick={() => setSelectedMedia(heroMedia)}
                className="px-6 py-3 rounded-full font-bold border-2 border-white/30 hover:border-white/60 bg-white/10 backdrop-blur-sm transition-all hover:scale-105"
              >
                <Info className="w-5 h-5 inline ml-1" />
                معلومات
              </button>
              <button
                onClick={() => toggleFavorite(heroMedia.id)}
                className={`p-3 rounded-full border-2 transition-all hover:scale-105 ${favorites.includes(heroMedia.id) ? 'bg-red-500 border-red-500' : 'border-white/30 hover:border-white/60 bg-white/10 backdrop-blur-sm'}`}
              >
                <Heart className={`w-5 h-5 ${favorites.includes(heroMedia.id) ? 'fill-white' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Tabs - only show when not searching */}
      {!searchQuery && (
        <div className="max-w-7xl mx-auto px-4 mb-4">
          <div className="flex gap-2 border-b border-white/10 pb-2">
            <button
              onClick={() => setActiveTab('trending')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all ${activeTab === 'trending' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Flame className="w-4 h-4 inline mr-1" />
              المميز
            </button>
            <button
              onClick={() => setActiveTab('recommended')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all ${activeTab === 'recommended' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Target className="w-4 h-4 inline mr-1" />
              موصى به لك
            </button>
            <button
              onClick={() => setActiveTab('playlists')}
              className={`px-4 py-2 rounded-t-lg font-bold transition-all ${activeTab === 'playlists' ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <BookmarkPlus className="w-4 h-4 inline mr-1" />
              قوائمي
            </button>
          </div>
        </div>
      )}

      {/* Movies Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {searchQuery ? (
          <>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
              <Search className="w-5 h-5 text-cyan-400" />
              نتائج البحث عن "{searchQuery}" ({filteredMovies.length})
            </h3>
            {isSearching ? (
              <div className="flex items-center justify-center py-20">
                <Loader className="w-12 h-12 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-4'}`}>
                {filteredMovies.map((movie) => (
                  <MediaCard
                    key={movie.id}
                    movie={movie}
                    viewMode={viewMode}
                    darkMode={darkMode}
                    isFavorite={favorites.includes(movie.id)}
                    progress={watchProgress[movie.id]}
                    onPlay={() => playMedia(movie)}
                    onInfo={() => setSelectedMedia(movie)}
                    onFavorite={() => toggleFavorite(movie.id)}
                    onShare={() => shareMedia(movie)}
                    onAddToPlaylist={(playlistId) => addToPlaylist(movie.id, playlistId)}
                    playlists={playlists}
                  />
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'trending' ? (
          <>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              المحتوى المميز
            </h3>
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-4'}`}>
              {filteredMovies.map((movie) => (
                <MediaCard
                  key={movie.id}
                  movie={movie}
                  viewMode={viewMode}
                  darkMode={darkMode}
                  isFavorite={favorites.includes(movie.id)}
                  progress={watchProgress[movie.id]}
                  onPlay={() => playMedia(movie)}
                  onInfo={() => setSelectedMedia(movie)}
                  onFavorite={() => toggleFavorite(movie.id)}
                  onShare={() => shareMedia(movie)}
                  onAddToPlaylist={(playlistId) => addToPlaylist(movie.id, playlistId)}
                  playlists={playlists}
                />
              ))}
            </div>
          </>
        ) : activeTab === 'recommended' ? (
          <>
            <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              موصى به بناءً على ذوقك
            </h3>
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-4'}`}>
              {getRecommendations().map((movie) => (
                <MediaCard
                  key={movie.id}
                  movie={movie}
                  viewMode={viewMode}
                  darkMode={darkMode}
                  isFavorite={favorites.includes(movie.id)}
                  progress={watchProgress[movie.id]}
                  onPlay={() => playMedia(movie)}
                  onInfo={() => setSelectedMedia(movie)}
                  onFavorite={() => toggleFavorite(movie.id)}
                  onShare={() => shareMedia(movie)}
                  onAddToPlaylist={(playlistId) => addToPlaylist(movie.id, playlistId)}
                  playlists={playlists}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {playlists.map(playlist => (
              <div key={playlist.id}>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-3xl">{playlist.emoji}</span>
                  {playlist.name}
                  <span className="text-sm text-gray-400">({playlist.items.length})</span>
                </h3>
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4' : 'space-y-4'}`}>
                  {playlist.items.map(itemId => {
                    const movie = movies.find(m => m.id === itemId);
                    if (!movie) return null;
                    return (
                      <MediaCard
                        key={movie.id}
                        movie={movie}
                        viewMode={viewMode}
                        darkMode={darkMode}
                        isFavorite={favorites.includes(movie.id)}
                        progress={watchProgress[movie.id]}
                        onPlay={() => playMedia(movie)}
                        onInfo={() => setSelectedMedia(movie)}
                        onFavorite={() => toggleFavorite(movie.id)}
                        onShare={() => shareMedia(movie)}
                        onAddToPlaylist={(playlistId) => addToPlaylist(movie.id, playlistId)}
                        playlists={playlists}
                      />
                    );
                  })}
                </div>
                {playlist.items.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <BookmarkPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>لم تقم بإضافة أي محتوى لهذه القائمة بعد</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {filteredMovies.length === 0 && !isSearching && searchQuery && (
          <div className="text-center py-20 text-gray-400">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-bold mb-2">لم يتم العثور على نتائج لـ "{searchQuery}"</p>
            <p className="text-sm mt-2">جرب:</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• تأكد من كتابة الاسم بشكل صحيح</li>
              <li>• استخدم الاسم بالإنجليزية (مثال: Rush, Inception)</li>
              <li>• جرب كلمات بحث أقصر</li>
            </ul>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-6 py-2 bg-cyan-400 text-black rounded-full font-bold hover:bg-cyan-300 transition-all"
            >
              مسح البحث
            </button>
          </div>
        )}

        {filteredMovies.length === 0 && !isSearching && !searchQuery && (
          <div className="text-center py-20 text-gray-400">
            <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">لا يوجد محتوى</p>
          </div>
        )}
      </div>

      {/* Modals and Player components remain the same... */}
      {selectedMedia && (
        <MediaDetailsModal
          media={selectedMedia}
          darkMode={darkMode}
          isFavorite={favorites.includes(selectedMedia.id)}
          similarContent={getSimilarContent(selectedMedia)}
          onClose={() => setSelectedMedia(null)}
          onPlay={() => {
            playMedia(selectedMedia);
            setSelectedMedia(null);
          }}
          onFavorite={() => toggleFavorite(selectedMedia.id)}
          onSimilarClick={(media) => {
            setSelectedMedia(media);
          }}
        />
      )}

      {playerMedia && (
        <VideoPlayer
          media={playerMedia}
          currentSeason={currentSeason}
          currentEpisode={currentEpisode}
          maxSeasons={maxSeasons}
          playbackSpeed={playbackSpeed}
          subtitleLang={subtitleLang}
          showSettings={showPlayerSettings}
          playerRef={playerRef}
          onClose={() => setPlayerMedia(null)}
          onSeasonChange={setCurrentSeason}
          onEpisodeChange={setCurrentEpisode}
          onSpeedChange={setPlaybackSpeed}
          onSubtitleChange={setSubtitleLang}
          onToggleSettings={() => setShowPlayerSettings(!showPlayerSettings)}
          getStreamUrl={getStreamUrl}
        />
      )}

      {showStatsModal && (
        <StatsModal
          stats={getStats()}
          darkMode={darkMode}
          watchHistory={watchHistory.map(h => movies.find(m => m.id === h.id)!).filter(Boolean)}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {showPlaylistModal && (
        <PlaylistModal
          playlists={playlists}
          darkMode={darkMode}
          onClose={() => setShowPlaylistModal(false)}
          onCreate={createPlaylist}
        />
      )}

      {showPartyModal && (
        <PartyModal
          darkMode={darkMode}
          partyRoom={partyRoom}
          onClose={() => setShowPartyModal(false)}
          onCreate={createPartyRoom}
          onCopyRoom={() => {
            navigator.clipboard.writeText(partyRoom);
            showToast('✅ تم نسخ رقم الغرفة!');
          }}
        />
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        iframe {
          border: none !important;
        }
      `}</style>
    </div>
  );
}

// Components remain the same from the previous version...
interface MediaCardProps {
  movie: MediaItem;
  viewMode: 'grid' | 'list';
  darkMode: boolean;
  isFavorite: boolean;
  progress?: number;
  onPlay: () => void;
  onInfo: () => void;
  onFavorite: () => void;
  onShare: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  playlists: Playlist[];
}

function MediaCard({ movie, viewMode, darkMode, isFavorite, progress, onPlay, onInfo, onFavorite, onShare, onAddToPlaylist, playlists }: MediaCardProps) {
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  return (
    <div
      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl overflow-hidden relative group cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl ${viewMode === 'list' ? 'flex h-32' : ''}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onFavorite();
        }}
        className={`absolute top-2 left-2 z-10 p-2 rounded-full backdrop-blur-sm transition-all hover:scale-110 ${isFavorite ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/50' : 'bg-black/60 hover:bg-black/80'}`}
      >
        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
      </button>

      <div className="absolute top-2 left-12 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPlaylistMenu(!showPlaylistMenu);
          }}
          className="p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all hover:scale-110"
        >
          <BookmarkPlus className="w-4 h-4" />
        </button>
        {showPlaylistMenu && (
          <div className={`absolute top-full left-0 mt-1 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-2xl p-2 min-w-[150px] border ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
            {playlists.map((pl: Playlist) => (
              <button
                key={pl.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToPlaylist(pl.id);
                  setShowPlaylistMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-cyan-400/10 text-sm flex items-center gap-2"
              >
                <span>{pl.emoji}</span>
                <span>{pl.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onShare();
        }}
        className="absolute top-2 right-10 z-10 p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all hover:scale-110"
      >
        <Share2 className="w-4 h-4" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onInfo();
        }}
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all hover:scale-110"
      >
        <Info className="w-4 h-4" />
      </button>

      {movie.rating && (
        <div className="absolute top-12 right-2 z-10 bg-gradient-to-r from-yellow-400 to-orange-500 px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <Star className="w-3 h-3 fill-white text-white" />
          <span className="text-xs font-bold text-white">{movie.rating}</span>
        </div>
      )}

      <div className="relative" onClick={onPlay}>
        <img
          src={movie.poster}
          alt={movie.title}
          className={`${viewMode === 'list' ? 'w-20 h-full' : 'w-full h-64'} object-cover transition-transform group-hover:scale-105`}
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
            <Play className="w-8 h-8 fill-white text-white" />
          </div>
        </div>
      </div>

      {progress && (
        <div className="absolute bottom-0 left-0 h-1 bg-gray-700 w-full z-10">
          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      <div
        className={`${viewMode === 'list' ? 'relative flex-1 bg-none' : 'absolute bottom-0 left-0 right-0'} p-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent`}
        onClick={onPlay}
      >
        <h3 className="font-semibold text-sm mb-1 truncate">{movie.title}</h3>
        <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
          <span>{movie.year}</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${movie.type === 'tv' ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'} text-white shadow-lg`}>
            {movie.type === 'tv' ? 'مسلسل' : 'فيلم'}
          </span>
        </div>
        {movie.genres && (
          <div className="flex gap-1 flex-wrap">
            {movie.genres.slice(0, 2).map((genre: string) => (
              <span key={genre} className="px-2 py-0.5 bg-white/10 rounded-full text-[10px]">
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface MediaDetailsModalProps {
  media: MediaItem;
  darkMode: boolean;
  isFavorite: boolean;
  similarContent: MediaItem[];
  onClose: () => void;
  onPlay: () => void;
  onFavorite: () => void;
  onSimilarClick: (media: MediaItem) => void;
}

function MediaDetailsModal({ media, darkMode, isFavorite, similarContent, onClose, onPlay, onFavorite, onSimilarClick }: MediaDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fade-in overflow-y-auto" onClick={onClose}>
      <div
        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-4xl w-full my-8 relative`}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="relative h-64 rounded-t-2xl overflow-hidden"
          style={{
            backgroundImage: `url(${media.backdrop || media.poster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-800 to-transparent"></div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/70 hover:bg-black/90 transition-colors backdrop-blur-sm"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="absolute bottom-4 left-6 right-6">
            <h2 className="text-3xl font-black mb-2 drop-shadow-lg">{media.title}</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-lg">{media.rating}</span>
              </span>
              <span className="text-gray-300">{media.year}</span>
              <span className={`px-3 py-1 rounded-full font-bold text-xs ${media.type === 'tv' ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'} text-white`}>
                {media.type === 'tv' ? 'مسلسل' : 'فيلم'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {media.genres && (
            <div className="flex gap-2 mb-4 flex-wrap">
              {media.genres.map((genre: string) => (
                <span key={genre} className="px-4 py-2 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 border border-cyan-400/30 text-cyan-400 rounded-full text-sm font-medium">
                  {genre}
                </span>
              ))}
            </div>
          )}

          <p className="text-gray-300 mb-6 leading-relaxed">{media.plot}</p>

          {media.cast && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                طاقم التمثيل
              </h3>
              <div className="flex gap-2 flex-wrap">
                {media.cast.map((actor: string) => (
                  <span key={actor} className={`px-3 py-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg text-sm`}>
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {similarContent.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-cyan-400" />
                محتوى مشابه
              </h3>
              <div className="grid grid-cols-4 gap-3">
                {similarContent.map((item: MediaItem) => (
                  <div
                    key={item.id}
                    onClick={() => onSimilarClick(item)}
                    className="cursor-pointer group"
                  >
                    <img src={item.poster} alt={item.title} className="w-full rounded-lg mb-2 group-hover:scale-105 transition-transform" />
                    <p className="text-xs truncate">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onPlay}
              className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-4 rounded-xl font-bold hover:from-cyan-500 hover:to-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
            >
              <Play className="w-6 h-6 fill-current" />
              تشغيل الآن
            </button>
            <button
              onClick={onFavorite}
              className={`p-4 rounded-xl border-2 transition-all ${isFavorite ? 'bg-gradient-to-r from-red-500 to-pink-500 border-red-500 shadow-lg shadow-red-500/30' : 'border-white/20 hover:border-white/40'}`}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface VideoPlayerProps {
  media: MediaItem;
  currentSeason: number;
  currentEpisode: number;
  maxSeasons: number;
  playbackSpeed: number;
  subtitleLang: string;
  showSettings: boolean;
  playerRef: React.RefObject<HTMLIFrameElement | null>;
  onClose: () => void;
  onSeasonChange: (season: number) => void;
  onEpisodeChange: (episode: number) => void;
  onSpeedChange: (speed: number) => void;
  onSubtitleChange: (lang: string) => void;
  onToggleSettings: () => void;
  getStreamUrl: (media: MediaItem, season?: number, episode?: number) => string;
}

function VideoPlayer({ media, currentSeason, currentEpisode, maxSeasons, playbackSpeed, subtitleLang, showSettings, playerRef, onClose, onSeasonChange, onEpisodeChange, onSpeedChange, onSubtitleChange, onToggleSettings, getStreamUrl }: VideoPlayerProps) {
  return (
    <div className="fixed inset-0 bg-black z-[999] flex flex-col">
      <div className="flex-shrink-0 flex justify-between items-center p-4 bg-gradient-to-r from-gray-900 to-black border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-colors shadow-lg"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-bold text-lg">{media.title}</h3>
            {media.type === 'tv' && (
              <p className="text-sm text-gray-400">الموسم {currentSeason} - الحلقة {currentEpisode}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSettings}
            className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${media.type === 'tv' ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'} text-white`}>
            {media.type === 'tv' ? 'مسلسل' : 'فيلم'}
          </span>
        </div>
      </div>

      {showSettings && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-white/10 p-4">
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                <Zap className="w-4 h-4" />
                سرعة التشغيل
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg text-white outline-none"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">عادي (1x)</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                <Languages className="w-4 h-4" />
                الترجمة
              </label>
              <select
                value={subtitleLang}
                onChange={(e) => onSubtitleChange(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 rounded-lg text-white outline-none"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="off">بدون ترجمة</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {media.type === 'tv' && (
        <div className="flex-shrink-0 bg-gradient-to-r from-gray-900 to-black border-b border-white/10 p-3">
          <div className="flex gap-3 items-center justify-center flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSeasonChange(Math.max(1, currentSeason - 1))}
                className="p-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg"
                disabled={currentSeason === 1}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <select
                value={currentSeason}
                onChange={(e) => {
                  const season = parseInt(e.target.value);
                  onSeasonChange(season);
                  onEpisodeChange(1);
                }}
                className="px-4 py-2 bg-gray-800 rounded-lg text-white outline-none font-medium min-w-[120px]"
              >
                {Array.from({ length: maxSeasons }, (_, i) => (
                  <option key={i + 1} value={i + 1}>الموسم {i + 1}</option>
                ))}
              </select>
              
              <button
                onClick={() => onSeasonChange(Math.min(maxSeasons, currentSeason + 1))}
                className="p-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-lg hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg"
                disabled={currentSeason === maxSeasons}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
            
            <span className="text-gray-400">|</span>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEpisodeChange(Math.max(1, currentEpisode - 1))}
                className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                disabled={currentEpisode === 1}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              
              <select
                value={currentEpisode}
                onChange={(e) => onEpisodeChange(parseInt(e.target.value))}
                className="px-4 py-2 bg-gray-800 rounded-lg text-white outline-none font-medium min-w-[120px]"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>الحلقة {i + 1}</option>
                ))}
              </select>
              
              <button
                onClick={() => onEpisodeChange(Math.min(24, currentEpisode + 1))}
                className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
                disabled={currentEpisode === 24}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative bg-black">
        <iframe
          ref={playerRef}
          key={`${media.id}-${currentSeason}-${currentEpisode}`}
          src={getStreamUrl(media, currentSeason, currentEpisode)}
          className="absolute top-0 left-0 w-full h-full border-0"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          scrolling="no"
        />
      </div>

      <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-lg text-sm text-gray-300">
        <kbd className="px-2 py-1 bg-gray-700 rounded">ESC</kbd> للخروج
      </div>
    </div>
  );
}

interface StatsModalProps {
  stats: {
    totalWatched: number;
    totalHours: number;
    favoriteCount: number;
    favoriteGenres: string[];
  };
  darkMode: boolean;
  watchHistory: MediaItem[];
  onClose: () => void;
}

function StatsModal({ stats, darkMode, watchHistory, onClose }: StatsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-2xl w-full p-6 animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">إحصائياتك</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4 text-center`}>
            <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-1">
              {stats.totalWatched}
            </div>
            <div className="text-sm text-gray-400">محتوى مشاهد</div>
          </div>
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4 text-center`}>
            <div className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-1">
              {stats.totalHours}
            </div>
            <div className="text-sm text-gray-400">ساعة مشاهدة</div>
          </div>
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4 text-center`}>
            <div className="text-3xl font-black bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent mb-1">
              {stats.favoriteCount}
            </div>
            <div className="text-sm text-gray-400">مفضلة</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">أنواعك المفضلة</h3>
          <div className="flex gap-2 flex-wrap">
            {stats.favoriteGenres.map((genre: string) => (
              <span key={genre} className="px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white rounded-full text-sm font-medium shadow-lg">
                {genre}
              </span>
            ))}
            {stats.favoriteGenres.length === 0 && (
              <p className="text-gray-400 text-sm">لم تقم بإضافة أي محتوى للمفضلة بعد</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            آخر المشاهدات
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {watchHistory.slice(0, 10).map((media: MediaItem) => (
              <div key={media.id} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-3 flex items-center gap-3`}>
                <img src={media.poster} alt={media.title} className="w-12 h-16 object-cover rounded" />
                <div className="flex-1">
                  <div className="font-medium">{media.title}</div>
                  <div className="text-sm text-gray-400">{media.year}</div>
                </div>
              </div>
            ))}
            {watchHistory.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">لم تشاهد أي محتوى بعد</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PlaylistModalProps {
  playlists: Playlist[];
  darkMode: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji: string) => void;
}

function PlaylistModal({ playlists, darkMode, onClose, onCreate }: PlaylistModalProps) {
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎬');

  const emojis = ['🎬', '⭐', '🔥', '💯', '🎭', '🎪', '🎨', '🎯', '💎', '🏆', '🎮', '🚀', '⚡', '🌟', '✨'];

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full p-6 animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BookmarkPlus className="w-6 h-6 text-cyan-400" />
            قوائم التشغيل
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4 mb-4`}>
          <h3 className="font-bold mb-3">إنشاء قائمة جديدة</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="اسم القائمة..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg outline-none ${darkMode ? 'bg-gray-600' : 'bg-white'}`}
            />
            <div>
              <label className="text-sm text-gray-400 mb-2 block">اختر رمزاً</label>
              <div className="flex gap-2 flex-wrap">
                {emojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewEmoji(emoji)}
                    className={`text-2xl p-2 rounded-lg transition-all ${newEmoji === emoji ? 'bg-cyan-400 scale-110' : 'bg-gray-600 hover:bg-gray-500'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                if (newName.trim()) {
                  onCreate(newName, newEmoji);
                  setNewName('');
                  setNewEmoji('🎬');
                }
              }}
              className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-3 rounded-lg font-bold hover:from-cyan-500 hover:to-blue-600 transition-all"
            >
              إنشاء القائمة
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold mb-2">قوائمك</h3>
          {playlists.map((playlist: Playlist) => (
            <div key={playlist.id} className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-3 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{playlist.emoji}</span>
                <div>
                  <div className="font-medium">{playlist.name}</div>
                  <div className="text-sm text-gray-400">{playlist.items.length} عنصر</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface PartyModalProps {
  darkMode: boolean;
  partyRoom: string;
  onClose: () => void;
  onCreate: () => void;
  onCopyRoom: () => void;
}

function PartyModal({ darkMode, partyRoom, onClose, onCreate, onCopyRoom }: PartyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full p-6 animate-fade-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-cyan-400" />
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">المشاهدة الجماعية</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-xl p-4 mb-4`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold">شاهد مع أصدقائك</h3>
              <p className="text-sm text-gray-400">مزامنة تلقائية في الوقت الفعلي</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onCreate}
            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white py-4 rounded-xl font-bold hover:from-cyan-500 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            إنشاء غرفة جديدة
          </button>

          {partyRoom && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-gradient-to-r from-gray-700 to-gray-600' : 'bg-gradient-to-r from-gray-100 to-gray-200'} border-2 border-cyan-400/30`}>
              <p className="text-sm text-gray-400 mb-2">رقم غرفتك:</p>
              <div className="flex items-center gap-2 mb-3">
                <code className="flex-1 font-mono text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  {partyRoom}
                </code>
                <button
                  onClick={onCopyRoom}
                  className="p-2 bg-cyan-400 text-black rounded-lg hover:bg-cyan-300 transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-gray-400">شارك هذا الرقم مع أصدقائك للإنضمام</p>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              placeholder="أدخل رقم الغرفة للإنضمام..."
              className={`w-full px-4 py-3 rounded-xl border-2 outline-none transition-all ${darkMode ? 'bg-gray-700 border-white/10 focus:border-cyan-400' : 'bg-gray-50 border-gray-200 focus:border-cyan-500'}`}
            />
          </div>

          <button className="w-full border-2 border-cyan-400 text-cyan-400 py-3 rounded-xl font-bold hover:bg-cyan-400/10 transition-all flex items-center justify-center gap-2">
            <Users className="w-5 h-5" />
            انضم إلى غرفة
          </button>
        </div>

        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>مزامنة تلقائية للتشغيل والإيقاف</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>دردشة نصية مباشرة</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>إشعارات عند انضمام الأصدقاء</span>
          </div>
        </div>
      </div>
    </div>
  );
}
