import React, { useState, useEffect, useRef, useCallback } from 'react';
import { catalogService } from '../../services/catalog/catalogService';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AnimeWallpaper {
  title: string;
  url: string;
}

const DEFAULT_POPULAR_WALLPAPERS: AnimeWallpaper[] = [
  {
    title: 'Demon Slayer: Kimetsu no Yaiba',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg',
  },
  {
    title: 'JUJUTSU KAISEN',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg',
  },
  {
    title: 'Attack on Titan',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
  },
  {
    title: 'ONE PIECE',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21-wf37VakJmZqs.jpg',
  },
  {
    title: 'Bleach: Thousand-Year Blood War',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/269-08ar2HJOUAuL.jpg',
  },
  {
    title: 'One-Punch Man',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21087-sHb9zUZFsHe1.jpg',
  },
  {
    title: 'My Hero Academia',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-yeVkolGKdGUV.jpg',
  },
  {
    title: 'Re:ZERO -Starting Life in Another World-',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/189046-MDk2CaVuRWpb.jpg',
  },
  {
    title: 'Fullmetal Alchemist: Brotherhood',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/5114-q0V5URebphSG.jpg',
  },
  {
    title: 'Naruto Shippuden',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20-HHxhPj5JD13a.jpg',
  },
  {
    title: 'Tokyo Ghoul',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/20605-RCJ7M71zLmrh.jpg',
  },
  {
    title: 'Hunter x Hunter',
    url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/11061-8WkkTZ6duKpq.jpg',
  }
];

interface AnimeBackgroundSlideshowProps {
  intervalMs?: number;
  children?: React.ReactNode;
}

export default function AnimeBackgroundSlideshow({
  intervalMs = 6000,
  children
}: AnimeBackgroundSlideshowProps) {
  const [wallpapers, setWallpapers] = useState<AnimeWallpaper[]>(DEFAULT_POPULAR_WALLPAPERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const timerRef = useRef<any>(null);

  // Dynamically fetch latest trending/popular anime banners from AniList
  useEffect(() => {
    let isMounted = true;

    async function loadDynamicBanners() {
      try {
        const [popular, trending] = await Promise.allSettled([
          catalogService.getPopular(1, 15),
          catalogService.getTrending(1, 15)
        ]);

        if (!isMounted) return;

        const collected: AnimeWallpaper[] = [];
        const seenUrls = new Set<string>();

        const addMedia = (items: any[]) => {
          for (const item of items) {
            const url = item.bannerImage;
            const title = item.title?.english || item.title?.romaji || 'Popular Anime';
            if (url && !seenUrls.has(url)) {
              seenUrls.add(url);
              collected.push({ title, url });
            }
          }
        };

        if (popular.status === 'fulfilled' && Array.isArray(popular.value)) {
          addMedia(popular.value);
        }
        if (trending.status === 'fulfilled' && Array.isArray(trending.value)) {
          addMedia(trending.value);
        }

        if (collected.length > 0) {
          // Merge dynamic with default list ensuring zero duplicates
          setWallpapers(prev => {
            const combined = [...prev];
            for (const item of collected) {
              if (!combined.some(w => w.url === item.url)) {
                combined.push(item);
              }
            }
            return combined;
          });
        }
      } catch (err) {
        console.warn('[ANIME SLIDESHOW NOTICE] Using default popular wallpapers:', err);
      }
    }

    loadDynamicBanners();

    return () => {
      isMounted = false;
    };
  }, []);

  // Preload next image for instant seamless cross-fades
  useEffect(() => {
    if (wallpapers.length === 0) return;
    const nextIdx = (currentIndex + 1) % wallpapers.length;
    const img = new Image();
    img.src = wallpapers[nextIdx].url;
  }, [currentIndex, wallpapers]);

  // Slideshow automatic rotation timer
  const nextSlide = useCallback(() => {
    setIsZooming(false);
    setCurrentIndex(prev => (prev + 1) % wallpapers.length);
  }, [wallpapers.length]);

  const prevSlide = useCallback(() => {
    setIsZooming(false);
    setCurrentIndex(prev => (prev - 1 + wallpapers.length) % wallpapers.length);
  }, [wallpapers.length]);

  useEffect(() => {
    timerRef.current = setInterval(nextSlide, intervalMs);
    setIsZooming(true);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSlide, intervalMs, currentIndex]);

  const currentWallpaper = wallpapers[currentIndex] || DEFAULT_POPULAR_WALLPAPERS[0];

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden bg-black selection:bg-purple-600 selection:text-white font-sans">
      {/* BACKGROUND IMAGE SLIDESHOW ENGINE */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {wallpapers.map((wp, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={wp.url}
              className={`absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
              style={{
                backgroundImage: `url(${wp.url})`,
                transform: isActive && isZooming ? 'scale(1.05)' : 'scale(1)',
                transition: 'opacity 1000ms ease-in-out, transform 6500ms ease-out'
              }}
            />
          );
        })}

        {/* Cinematic Atmospheric Lighting Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/25 to-black/75 z-20 pointer-events-none" />
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1.5px] z-20 pointer-events-none" />
      </div>

      {/* FOREGROUND CONTENT (Header, Login/Signup Card, Footer) */}
      <div className="relative z-30 flex-1 flex flex-col justify-between">
        {children}
      </div>

      {/* FLOATING ANIME SHOWCASE BADGE (Bottom-Left) */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-xl text-white shadow-2xl transition group">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />
          <span className="text-xs font-bold truncate max-w-[180px] sm:max-w-[280px] drop-shadow">
            {currentWallpaper.title}
          </span>

          <div className="flex items-center gap-0.5 ml-1 border-l border-white/20 pl-2">
            <button
              type="button"
              onClick={prevSlide}
              className="p-1 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
              title="Previous Anime"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextSlide}
              className="p-1 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
              title="Next Anime"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
