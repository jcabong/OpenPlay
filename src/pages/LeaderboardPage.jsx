import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    // Logic: Get all games and group by user to calculate win rates
    const { data, error } = await supabase
      .from('games')
      .select('user_id, result, users(username)');

    if (data) {
      const stats = data.reduce((acc, game) => {
        const name = game.users?.username || 'Player';
        if (!acc[name]) acc[name] = { wins: 0, total: 0 };
        acc[name].total += 1;
        if (game.result === 'win') acc[name].wins += 1;
        return acc;
      }, {});

      const sorted = Object.entries(stats)
        .map(([name, s]) => ({ name, winRate: ((s.wins / s.total) * 100).toFixed(1), total: s.total }))
        .sort((a, b) => b.winRate - a.winRate);
      
      setLeaders(sorted);
    }
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Top Players</h1>
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {leaders.map((player, i) => (
          <div key={player.name} className="flex justify-between p-4 border-b last:border-0 items-center">
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-400">#{i + 1}</span>
              <span className="font-semibold">@{player.name}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-green-600">{player.winRate}% Win Rate</div>
              <div className="text-xs text-gray-400">{player.total} matches</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}