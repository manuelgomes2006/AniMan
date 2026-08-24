import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Send } from 'lucide-react';
import { getUserProfile } from '../../services/userStore';

interface CommentItem {
  id: string;
  username: string;
  avatar: string;
  badge?: string;
  timestamp: string;
  content: string;
  likes: number;
}

export default function CommentsSection() {
  const [activeTab, setActiveTab] = useState<'comments' | 'reviews'>('comments');
  const [newComment, setNewComment] = useState('');
  const user = getUserProfile();

  const [commentsList, setCommentsList] = useState<CommentItem[]>([
    {
      id: 'c1',
      username: 'ShadowMonarch',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      badge: 'Top Fan',
      timestamp: '2h ago',
      content: 'This episode was insane! The animation is next level 🔥',
      likes: 245
    },
    {
      id: 'c2',
      username: 'SungJinWoo',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      badge: 'VIP Member',
      timestamp: '4h ago',
      content: 'Arise! The shadow army reveal gave me chills.',
      likes: 189
    }
  ]);

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommentsList(prev => [
      {
        id: `c_${Date.now()}`,
        username: user?.username || 'Hunter',
        avatar: user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        badge: 'Member',
        timestamp: 'Just now',
        content: newComment.trim(),
        likes: 1
      },
      ...prev
    ]);

    setNewComment('');
  };

  return (
    <div className="bg-[#0D0D12]/90 border border-slate-800/80 rounded-3xl p-5 space-y-5 shadow-xl">
      {/* Tab Bar: Comments (1.2K) | Reviews (340) */}
      <div className="flex items-center border-b border-slate-800/80 pb-3 gap-6 text-sm">
        <button
          onClick={() => setActiveTab('comments')}
          className={`font-extrabold pb-2 transition relative cursor-pointer ${
            activeTab === 'comments' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Comments (1.2K)
          {activeTab === 'comments' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('reviews')}
          className={`font-extrabold pb-2 transition relative cursor-pointer ${
            activeTab === 'reviews' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Reviews (340)
          {activeTab === 'reviews' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Input Row: Avatar + Input + Post Button */}
      <form onSubmit={handlePostComment} className="flex items-center gap-3">
        <img
          src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
          alt="Avatar"
          className="w-9 h-9 rounded-full object-cover shrink-0 border border-purple-500/40"
        />
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-[#050507] text-white placeholder-slate-500 px-4 py-2.5 rounded-2xl border border-slate-800 focus:outline-none focus:border-purple-500 text-xs font-semibold"
        />
        <button
          type="submit"
          className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-purple-950/60 transition cursor-pointer shrink-0"
        >
          Post
        </button>
      </form>

      {/* Comments Thread */}
      <div className="space-y-4 pt-2">
        {commentsList.map(comment => (
          <div key={comment.id} className="flex gap-3 text-xs">
            <img
              src={comment.avatar}
              alt={comment.username}
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-800"
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-200">{comment.username}</span>
                {comment.badge && (
                  <span className="bg-purple-950/80 text-purple-300 text-[9px] font-black px-2 py-0.5 rounded-md border border-purple-800/40">
                    {comment.badge}
                  </span>
                )}
                <span className="text-[10px] text-slate-500 font-semibold">{comment.timestamp}</span>
              </div>

              <p className="text-slate-300 text-xs leading-relaxed">{comment.content}</p>

              <div className="flex items-center gap-4 pt-1 text-slate-400 text-[11px]">
                <button className="flex items-center gap-1 hover:text-purple-400 transition cursor-pointer">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{comment.likes}</span>
                </button>
                <button className="hover:text-purple-400 transition cursor-pointer">
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                <button className="font-bold hover:text-slate-200 transition cursor-pointer">
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
