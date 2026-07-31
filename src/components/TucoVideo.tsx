import { useState } from 'react';
import { Play } from 'lucide-react';
import { Conversation, Reply, UserRole } from '../types';

const YT_REGEXES = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{6,20})/i,
  /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{6,20})/i,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:[^\s&]*&)*v=([A-Za-z0-9_-]{6,20})/i,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{6,20})/i,
];

export function parseYouTubeId(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const re of YT_REGEXES) {
    const m = text.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

export function stripYouTubeUrl(text: string): string {
  let out = text;
  for (const re of YT_REGEXES) {
    out = out.replace(new RegExp(re.source + '\\S*', 'i'), '').trim();
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

function isTucoTeam(role: UserRole | undefined | null): boolean {
  return role === 'tuco_team';
}

export function findTucoVideoReply(thread: Pick<Conversation, 'replies'>): Reply | null {
  if (!thread.replies) return null;
  const walk = (rs: Reply[]): Reply | null => {
    for (const r of rs) {
      if (isTucoTeam(r.authorRole) && parseYouTubeId(r.text)) return r;
      if (r.replies && r.replies.length) {
        const found = walk(r.replies);
        if (found) return found;
      }
    }
    return null;
  };
  return walk(thread.replies);
}

interface TucoVideoCardProps {
  videoId: string;
  caption?: string;
  variant?: 'feed' | 'thread' | 'feed-fullbleed' | 'feed-inline';
  // Optional custom poster (e.g. a curated thumbnail bundled under
  // /thumbnails/). When set, we skip the YouTube-derived poster entirely so
  // the branded thumbnail always renders — no flicker while YouTube's oar2.jpg
  // 404s and no fallback chain.
  posterUrl?: string;
}

export function TucoVideoCard({ videoId, caption, variant = 'feed', posterUrl }: TucoVideoCardProps) {
  const [playing, setPlaying] = useState(false);
  // oar2.jpg / oardefault.jpg are YouTube Shorts' native portrait posters
  // (1080x1920 / 720x1280). Fall back to hqdefault.jpg for regular videos.
  const poster = posterUrl || `https://i.ytimg.com/vi/${videoId}/oar2.jpg`;
  // youtube-nocookie.com previously here triggered YouTube error 153
  // ("video player configuration error") for at least one tuco-team Short
  // (-hyb99wJmNk) — the channel apparently hasn't enabled embedding on the
  // privacy-enhanced domain specifically, even though regular youtube.com
  // embeds it fine (confirmed via YouTube's own oembed endpoint).
  const embed = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
  const aspect = variant === 'thread' ? 'aspect-video' : 'aspect-[9/16]';
  // feed-fullbleed: on mobile keep the near-full-width look but with a small
  // side gutter (proportionally reduces the 9:16 height); on desktop cap the
  // video around Instagram-Shorts sizing (~360px) so the card doesn't stretch
  // into a 1200px-tall block.
  const wrap =
    variant === 'feed-fullbleed'
      ? 'w-[calc(100%-1rem)] max-w-[92vw] mx-auto rounded-2xl md:max-w-[360px]'
      : variant === 'feed-inline'
      ? 'w-full rounded-2xl'
      : 'w-full max-w-[420px] mx-auto rounded-2xl mt-3 mb-2';

  return (
    <div
      className={`tuco-video-card relative ${aspect} bg-black overflow-hidden ${wrap}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!playing) setPlaying(true);
      }}
    >
      {playing ? (
        <iframe
          src={embed}
          title="tuco team video"
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <>
          <img
            src={poster}
            alt=""
            loading="eager"
            className="absolute inset-0 w-full h-full object-cover opacity-90"
            onError={(e) => {
              // Only walk the YouTube poster fallback chain when we're
              // relying on YouTube in the first place — a custom posterUrl
              // that 404s should surface, not silently swap to a Shorts
              // thumbnail of an unrelated video.
              if (posterUrl) return;
              const img = e.currentTarget;
              if (img.src.endsWith('/oar2.jpg')) img.src = `https://i.ytimg.com/vi/${videoId}/oardefault.jpg`;
              else if (img.src.endsWith('/oardefault.jpg')) img.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/60" />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/55 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <div className="w-4 h-4 rounded-full bg-[#FED018] flex items-center justify-center text-[9px] font-bold text-[#4D4747]">
              T
            </div>
            <span className="text-white text-[11px] font-medium">tuco team</span>
          </div>
          <button
            type="button"
            aria-label="Play video"
            className="absolute inset-0 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setPlaying(true); }}
          >
            <span className="w-16 h-16 rounded-full bg-[#FED018]/95 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
              <Play className="w-8 h-8 text-[#4D4747] fill-[#4D4747]" strokeWidth={0} />
            </span>
          </button>
          {caption ? (
            <div className="absolute bottom-3 left-3 right-3 text-white text-[13px] font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)] line-clamp-2">
              {caption}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
