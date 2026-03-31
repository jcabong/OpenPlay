import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date_start', { ascending: true });
        
        if (error) throw error;
        setEvents(data || []);
      } catch (err) {
        console.error("Error fetching events:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Upcoming Events</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">
          + Host Event
        </button>
      </div>
      
      <div className="grid gap-4">
        {loading ? (
          <p className="text-gray-500 italic">Finding matches in your area...</p>
        ) : events.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed">
            <p className="text-gray-500">No tournaments or clinics found yet.</p>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-500">
                  {event.event_type?.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(event.date_start).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-bold mt-1">{event.title}</h3>
              <p className="text-gray-600 text-sm">📍 {event.venue}, {event.city}</p>
              
              <div className="mt-4 flex justify-between items-center pt-4 border-t border-gray-50">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Sport</span>
                  <span className="text-sm font-semibold capitalize">{event.sport}</span>
                </div>
                <button className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-black">
                  Join Event
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}