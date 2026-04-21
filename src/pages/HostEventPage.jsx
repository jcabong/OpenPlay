import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function HostEventPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    sport: 'pickleball',
    event_type: 'open_play',
    venue: '',
    city: '',
    date_start: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('events')
        .insert([{
          host_id: user.id,
          title: formData.title,
          sport: formData.sport,
          event_type: formData.event_type,
          venue: formData.venue,
          city: formData.city,
          date_start: new Date(formData.date_start).toISOString(),
        }]);

      if (error) throw error;
      alert("Event Published!");
      navigate('/events');
    } catch (err) {
      alert("Error hosting event: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-2xl shadow-sm mt-10 border border-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Host an Event</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Event Title</label>
          <input required className="w-full p-3 border rounded-xl mt-1" placeholder="e.g. Saturday Mixers"
            onChange={(e) => setFormData({...formData, title: e.target.value})} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Sport</label>
            <select className="w-full p-3 border rounded-xl mt-1" onChange={(e) => setFormData({...formData, sport: e.target.value})}>
              <option value="pickleball">Pickleball</option>
              <option value="badminton">Badminton</option>
              <option value="tennis">Tennis</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select className="w-full p-3 border rounded-xl mt-1" onChange={(e) => setFormData({...formData, event_type: e.target.value})}>
              <option value="open_play">Open Play</option>
              <option value="tournament">Tournament</option>
              <option value="clinic">Clinic</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Venue & City</label>
          <div className="flex gap-2">
            <input required className="w-1/2 p-3 border rounded-xl mt-1" placeholder="Venue"
              onChange={(e) => setFormData({...formData, venue: e.target.value})} />
            <input required className="w-1/2 p-3 border rounded-xl mt-1" placeholder="City"
              onChange={(e) => setFormData({...formData, city: e.target.value})} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date & Time</label>
          <input required type="datetime-local" className="w-full p-3 border rounded-xl mt-1"
            onChange={(e) => setFormData({...formData, date_start: e.target.value})} />
        </div>

        <button disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-xl font-bold hover:bg-blue-700 transition">
          {loading ? "Publishing..." : "Launch Event"}
        </button>
      </form>
    </div>
  );
}