import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function FeedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users ( username, avatar_url )
        `)
        .order('inserted_at', { ascending: false });

      if (error) throw error;
      setPosts(data);
    } catch (err) {
      console.error("Error fetching feed:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Network Feed</h1>
      {loading ? <p>Loading activity...</p> : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-blue-600">@{post.users?.username}</span>
                  <p className="mt-1 text-gray-800">{post.content}</p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{post.sport}</span>
              </div>
              <div className="mt-3 flex items-center text-xs text-gray-500">
                <span>📍 {post.city || 'Unknown Location'}</span>
                <span className="mx-2">•</span>
                <span>{new Date(post.inserted_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}