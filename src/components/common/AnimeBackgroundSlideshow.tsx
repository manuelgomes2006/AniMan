import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export interface AnimeDP {
  id: number;
  name: string;
  anime: string;
  image: string;
}

// Curated roster of 50 iconic Anime Character Display Pictures (DPs) from official AniList CDN
export const DEFAULT_ANIME_DPS: AnimeDP[] = [
  {
    id: 127691,
    name: 'Satoru Gojou',
    anime: 'Jujutsu Kaisen',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b127691-9zqh1xpIubn7.png'
  },
  {
    id: 45627,
    name: 'Levi Ackerman',
    anime: 'Attack on Titan',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b45627-CR68RyZmddGG.png'
  },
  {
    id: 40,
    name: 'Monkey D. Luffy',
    anime: 'ONE PIECE',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b40-MNypXsxSRb1R.png'
  },
  {
    id: 62,
    name: 'Roronoa Zoro',
    anime: 'ONE PIECE',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b62-S7oAeA9WInjV.png'
  },
  {
    id: 27,
    name: 'Killua Zoldyck',
    anime: 'Hunter x Hunter',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b27-Z5O02kQUydpT.jpg'
  },
  {
    id: 40882,
    name: 'Eren Yeager',
    anime: 'Attack on Titan',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b40882-dsj7IP943WFF.jpg'
  },
  {
    id: 176754,
    name: 'Frieren',
    anime: 'Frieren: Beyond Journey’s End',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b176754-PCnpqIOkjhFk.png'
  },
  {
    id: 126071,
    name: 'Tanjiro Kamado',
    anime: 'Demon Slayer',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b126071-BTNEc1nRIv68.png'
  },
  {
    id: 127518,
    name: 'Nezuko Kamado',
    anime: 'Demon Slayer',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b127518-NRlq1CQ1v1ro.png'
  },
  {
    id: 85,
    name: 'Kakashi Hatake',
    anime: 'Naruto Shippuden',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b85-mkVBh2yjxjmx.png'
  },
  {
    id: 17,
    name: 'Naruto Uzumaki',
    anime: 'Naruto Shippuden',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b17-phjcWCkRuIhu.png'
  },
  {
    id: 14,
    name: 'Itachi Uchiha',
    anime: 'Naruto Shippuden',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b14-9Kb1E5oel1ke.png'
  },
  {
    id: 130102,
    name: 'Denji',
    anime: 'Chainsaw Man',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b130102-FO1VHNnEnLlB.png'
  },
  {
    id: 137080,
    name: 'Makima',
    anime: 'Chainsaw Man',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b137080-UHcynYNjb5ZU.png'
  },
  {
    id: 137079,
    name: 'Power',
    anime: 'Chainsaw Man',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b137079-6yLEUYR3bmpr.png'
  },
  {
    id: 127212,
    name: 'Yuuji Itadori',
    anime: 'Jujutsu Kaisen',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b127212-FVm2tD0erQ5B.png'
  },
  {
    id: 126635,
    name: 'Megumi Fushiguro',
    anime: 'Jujutsu Kaisen',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b126635-L0y3I92JSUkN.png'
  },
  {
    id: 71,
    name: 'L Lawliet',
    anime: 'Death Note',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b71-1W4panC53vfs.png'
  },
  {
    id: 80,
    name: 'Light Yagami',
    anime: 'Death Note',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b80-26EhwSsSqQ50.png'
  },
  {
    id: 417,
    name: 'Lelouch Lamperouge',
    anime: 'Code Geass',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b417-gVLmIJu9phcK.png'
  },
  {
    id: 88572,
    name: 'Emilia',
    anime: 'Re:ZERO',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b88572-IzTwXEHSobRs.jpg'
  },
  {
    id: 88575,
    name: 'Rem',
    anime: 'Re:ZERO',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b88575-Ayu8UPDA8NS6.png'
  },
  {
    id: 40881,
    name: 'Mikasa Ackerman',
    anime: 'Attack on Titan',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b40881-F3gr1PkreDvj.png'
  },
  {
    id: 87275,
    name: 'Ken Kaneki',
    anime: 'Tokyo Ghoul',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b87275-mb13EWZBdbh3.png'
  },
  {
    id: 11,
    name: 'Edward Elric',
    anime: 'Fullmetal Alchemist: Brotherhood',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b11-TA5Nuk7EDUZG.jpg'
  },
  {
    id: 89334,
    name: 'Arataka Reigen',
    anime: 'Mob Psycho 100',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b89334-OPj1hCzvrt7X.png'
  },
  {
    id: 89616,
    name: 'Shigeo Kageyama (Mob)',
    anime: 'Mob Psycho 100',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b89616-dXmdOc7L6SDi.png'
  },
  {
    id: 422,
    name: 'Guts',
    anime: 'Berserk',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b422-XTaiTuvRohsV.png'
  },
  {
    id: 34470,
    name: 'Kurisu Makise',
    anime: 'Steins;Gate',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b34470-Jw2LXZBL5R8i.png'
  },
  {
    id: 35252,
    name: 'Rintarou Okabe',
    anime: 'Steins;Gate',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b35252-DY9TW6pusqeh.png'
  },
  {
    id: 127222,
    name: 'Mai Sakurajima',
    anime: 'Bunny Girl Senpai',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b127222-Jh5hhP7vZ7s1.png'
  },
  {
    id: 126824,
    name: 'Maomao',
    anime: 'The Apothecary Diaries',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b126824-MqsCncTO1qpv.png'
  },
  {
    id: 28,
    name: 'Kurapika',
    anime: 'Hunter x Hunter',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b28-ivA7UGnfE40a.png'
  },
  {
    id: 30,
    name: 'Gon Freecss',
    anime: 'Hunter x Hunter',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b30-lyFExKyDhefc.jpg'
  },
  {
    id: 120649,
    name: 'Kaguya Shinomiya',
    anime: 'Kaguya-sama: Love is War',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b120649-NPaWaIpWy60E.png'
  },
  {
    id: 121103,
    name: 'Chika Fujiwara',
    anime: 'Kaguya-sama: Love is War',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b121103-UGLxT8utLPnq.png'
  },
  {
    id: 90169,
    name: 'Violet Evergarden',
    anime: 'Violet Evergarden',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b90169-4wr1Zehnsac8.png'
  },
  {
    id: 89220,
    name: 'Shouto Todoroki',
    anime: 'My Hero Academia',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b89220-KNBwaVFAR8FD.png'
  },
  {
    id: 88892,
    name: 'Katsuki Bakugou',
    anime: 'My Hero Academia',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b88892-bdOha3lNcaN6.png'
  },
  {
    id: 89198,
    name: 'Osamu Dazai',
    anime: 'Bungo Stray Dogs',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b89198-qKmRTw4Y3PRC.png'
  },
  {
    id: 89361,
    name: 'Megumin',
    anime: 'KONOSUBA',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b89361-tq8PQQ4MmF0M.png'
  },
  {
    id: 133676,
    name: 'Marin Kitagawa',
    anime: 'My Dress-Up Darling',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b133676-kV2czE3C8Qls.png'
  },
  {
    id: 672,
    name: 'Gintoki Sakata',
    anime: 'Gintama',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b672-cP5VPriN67xJ.png'
  },
  {
    id: 123212,
    name: 'Kiyotaka Ayanokouji',
    anime: 'Classroom of the Elite',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b123212-ewZgUQr9vvEM.png'
  },
  {
    id: 124142,
    name: 'Senkuu Ishigami',
    anime: 'Dr. STONE',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b124142-XUO1g7wRqkaT.png'
  },
  {
    id: 124381,
    name: 'Zero Two',
    anime: 'DARLING in the FRANXX',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b124381-2gAVq76HPfL2.png'
  },
  {
    id: 10138,
    name: 'Thorfinn Karlsefni',
    anime: 'Vinland Saga',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b10138-zOPrka0ddZOR.png'
  },
  {
    id: 13020,
    name: 'Askeladd',
    anime: 'Vinland Saga',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b13020-ZdiYlNmpRUNS.png'
  },
  {
    id: 6356,
    name: 'Joseph Joestar',
    anime: "JoJo's Bizarre Adventure",
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b6356-RImEfUfHpC58.png'
  },
  {
    id: 500,
    name: 'Sakura Matou',
    anime: 'Fate/stay night',
    image: 'https://s4.anilist.co/file/anilistcdn/character/large/b500-NQrLbnBr1sDv.png'
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
  const [characterDps, setCharacterDps] = useState<AnimeDP[]>(DEFAULT_ANIME_DPS);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const timerRef = useRef<any>(null);

  // Divide DPs into 5 scrolling rows for an ultra-rich drifting mosaic matrix
  const row1 = characterDps.slice(0, 10);
  const row2 = characterDps.slice(10, 20);
  const row3 = characterDps.slice(20, 30);
  const row4 = characterDps.slice(30, 40);
  const row5 = characterDps.slice(40, 50);

  // Dynamic fetch to expand DPs from AniList
  useEffect(() => {
    let isMounted = true;
    async function fetchExtraCharacters() {
      try {
        const query = `
          query {
            Page(page: 1, perPage: 40) {
              characters(sort: FAVOURITES_DESC) {
                id
                name { full }
                image { large }
                media(page: 1, perPage: 1) {
                  nodes {
                    title { english romaji }
                  }
                }
              }
            }
          }
        `;
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        if (!res.ok) return;
        const json = await res.json();
        const apiChars: AnimeDP[] = (json.data?.Page?.characters || []).map((c: any) => ({
          id: c.id,
          name: c.name.full,
          anime: c.media?.nodes?.[0]?.title?.english || c.media?.nodes?.[0]?.title?.romaji || 'Anime',
          image: c.image?.large
        })).filter((c: AnimeDP) => c.image);

        if (isMounted && apiChars.length > 0) {
          setCharacterDps(prev => {
            const map = new Map<number, AnimeDP>();
            prev.forEach(p => map.set(p.id, p));
            apiChars.forEach(c => map.set(c.id, c));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('[Anime DP Notice] Using default curated character DPs:', err);
      }
    }

    fetchExtraCharacters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Spotlight rotation timer
  const nextSpotlight = useCallback(() => {
    setFeaturedIndex(prev => (prev + 1) % characterDps.length);
  }, [characterDps.length]);

  const prevSpotlight = useCallback(() => {
    setFeaturedIndex(prev => (prev - 1 + characterDps.length) % characterDps.length);
  }, [characterDps.length]);

  useEffect(() => {
    timerRef.current = setInterval(nextSpotlight, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [nextSpotlight, intervalMs]);

  const featuredDP = characterDps[featuredIndex] || DEFAULT_ANIME_DPS[0];

  const renderDPRow = (items: AnimeDP[], animationClass: string) => {
    // Duplicate items for seamless continuous marquee loop
    const loopedItems = [...items, ...items];

    return (
      <div className="overflow-hidden w-full flex select-none py-1.5 opacity-40 hover:opacity-75 transition-opacity duration-500">
        <div className={`${animationClass} gap-3 sm:gap-4.5 px-2`}>
          {loopedItems.map((dp, idx) => (
            <div
              key={`${dp.id}-${idx}`}
              className="relative w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#0E0E17]/80 backdrop-blur-md shadow-lg shadow-black/60 group cursor-pointer transition-all duration-300 hover:scale-110 hover:border-purple-500/80 hover:shadow-purple-500/30 hover:z-20"
              onClick={() => setFeaturedIndex(characterDps.findIndex(c => c.id === dp.id) || 0)}
              title={`${dp.name} (${dp.anime})`}
            >
              <img
                src={dp.image}
                alt={dp.name}
                loading="lazy"
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="text-[10px] font-black text-white truncate drop-shadow">
                  {dp.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden bg-[#06060A] selection:bg-purple-600 selection:text-white font-sans">
      {/* BACKGROUND ANIME DP MOSAIC MATRIX */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Ambient Glowing Centerpiece Aura */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-[380px] h-[380px] sm:w-[500px] sm:h-[500px] rounded-full bg-cover bg-center blur-3xl opacity-20 transition-all duration-1000 ease-out scale-110"
            style={{
              backgroundImage: `url(${featuredDP.image})`,
            }}
          />
        </div>

        {/* 5 Angled / Drifting Rows of Anime Character DPs */}
        <div className="absolute -inset-10 flex flex-col justify-center gap-1 sm:gap-2.5 -rotate-2 scale-105 pointer-events-auto">
          {renderDPRow(row1, 'animate-marquee-left-slow')}
          {renderDPRow(row2, 'animate-marquee-right-slow')}
          {renderDPRow(row3, 'animate-marquee-left-med')}
          {renderDPRow(row4, 'animate-marquee-right-med')}
          {renderDPRow(row5, 'animate-marquee-left-slow')}
        </div>

        {/* Cinematic Atmospheric Lighting & Contrast Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06060A]/85 via-[#06060A]/60 to-[#06060A]/90 z-10 pointer-events-none" />
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(6, 6, 10, 0.45) 0%, rgba(6, 6, 10, 0.92) 100%)'
          }}
        />
        <div className="absolute inset-0 backdrop-blur-[1px] z-10 pointer-events-none" />
      </div>

      {/* FOREGROUND CONTENT (Header, Login/Signup Card, Footer) */}
      <div className="relative z-30 flex-1 flex flex-col justify-between">
        {children}
      </div>

      {/* FLOATING ANIME DP SHOWCASE PILL (Bottom-Left) */}
      <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-40 flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0D0D14]/80 hover:bg-[#0D0D14]/95 border border-white/20 backdrop-blur-xl text-white shadow-2xl transition group">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 animate-pulse" />

          {/* Mini Character Avatar DP Circle */}
          <div className="w-6 h-6 rounded-full overflow-hidden border border-purple-400/80 shrink-0 shadow-sm bg-purple-950">
            <img
              src={featuredDP.image}
              alt={featuredDP.name}
              className="w-full h-full object-cover object-top"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold truncate max-w-[170px] sm:max-w-[260px]">
            <span className="text-white truncate">{featuredDP.name}</span>
            <span className="text-slate-400 font-normal truncate hidden sm:inline">• {featuredDP.anime}</span>
          </div>

          <div className="flex items-center gap-0.5 ml-1 border-l border-white/20 pl-2">
            <button
              type="button"
              onClick={prevSpotlight}
              className="p-1 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
              title="Previous Anime DP"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={nextSpotlight}
              className="p-1 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition cursor-pointer"
              title="Next Anime DP"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
