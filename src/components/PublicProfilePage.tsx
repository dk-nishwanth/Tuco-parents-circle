import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, ThumbsUp, Calendar, MapPin } from 'lucide-react';
import { api, tokenStore } from '../utils/api';
import { LoadingScreen } from './LoadingScreen';
import { FollowButton } from './FollowButton';
import { track } from '../utils/analytics';

type ProfileData = Awaited<ReturnType<typeof api.getPublicProfile>>;

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = ['#FED018', '#35B5EC', '#EB3200', '#10B981', '#A78BFA', '#F97316'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return colors[hash % colors.length];
}

export function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [meLoading, setMeLoading] = useState(!!tokenStore.get());
  const trackedProfileRef = useRef<string | null>(null);

  useEffect(() => {
    if (!tokenStore.get()) { setMe(null); setMeLoading(false); return; }
    api.getMe().then(u => setMe({ id: u.id })).catch(() => setMe(null)).finally(() => setMeLoading(false));
  }, []);

  // Fires once per profile visited, after we know both who the profile
  // belongs to AND whether the viewer is logged in — so 'own' vs 'other'
  // isn't a coin-flip on which of the two requests happens to resolve first.
  useEffect(() => {
    if (!data || meLoading || trackedProfileRef.current === data.user.id) return;
    trackedProfileRef.current = data.user.id;
    track('profile_viewed', {
      profile_username: data.user.username,
      viewer_relation: !me ? 'guest' : me.id === data.user.id ? 'own' : 'other',
    });
  }, [data, me, meLoading]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    setNotFound(false);
    api
      .getPublicProfile(username)
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [username]);

  if (loading) return <LoadingScreen />;

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6">
        <h1 className="font-display font-black text-2xl text-[#4D4747] mb-2">User not found</h1>
        <p className="text-sm text-neutral-500 mb-6">We couldn't find a member with that name.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-[#35B5EC] text-white px-5 py-2 rounded-lg font-display font-bold text-sm"
        >
          Back to home
        </button>
      </div>
    );
  }

  const { user, threads } = data;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2 hover:bg-neutral-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-[#4D4747]" />
          </button>
          <h1 className="font-display font-black text-base text-[#4D4747]">{user.username}'s profile</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-black text-2xl shrink-0"
              style={{ backgroundColor: getAvatarColor(user.username), color: '#4D4747' }}
            >
              {getInitials(user.username)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display font-black text-2xl text-[#4D4747]">{user.username}</h2>
                {me && me.id !== user.id && (
                  <FollowButton
                    targetType="user"
                    targetId={user.id}
                    isLoggedIn={true}
                    onRequireLogin={() => {}}
                    size="md"
                  />
                )}
                {!me && (
                  <FollowButton
                    targetType="user"
                    targetId={user.id}
                    isLoggedIn={false}
                    onRequireLogin={() => navigate('/')}
                    size="md"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-neutral-500">
                {user.city && user.city !== 'India' && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {user.city}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Joined {new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                <Stat icon={<MessageSquare className="w-4 h-4" />} label="Posts" value={user.postCount} />
                <Stat icon={<MessageSquare className="w-4 h-4" />} label="Replies" value={user.replyCount} />
                <Stat icon={<ThumbsUp className="w-4 h-4" />} label="Upvotes received" value={user.totalUpvotes} />
              </div>
            </div>
          </div>
        </div>

        <h3 className="font-display font-black text-lg text-[#4D4747] mb-3">Posts by {user.username}</h3>
        {threads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-neutral-500 text-sm">
            {user.username} hasn't posted anything yet.
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map(t => (
              <button
                key={t.id}
                onClick={() => navigate(`/?thread=${t.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-neutral-200 p-4 hover:border-[#35B5EC] transition-colors"
              >
                <p className="text-xs text-neutral-400 mb-1">{t.category}</p>
                <h4 className="font-display font-bold text-[#4D4747] text-base mb-2">{t.title}</h4>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> {t.votes}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {t.replyCount} replies</span>
                  <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-[#35B5EC]">{icon}</span>
      <span className="font-bold text-[#4D4747]">{value}</span>
      <span className="text-neutral-500">{label}</span>
    </div>
  );
}
