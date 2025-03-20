import { supabase } from '@/lib/supabase';
import { TravelSuggestions } from '@/types';
import { Trip, UpdateTrip } from '@/types/supabase';

// Save a new trip
export async function saveTrip(tripData: {
  user_id: string;
  trip_title: string;
  destination: string;
  data: TravelSuggestions;
}): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .insert({
      user_id: tripData.user_id,
      trip_title: tripData.trip_title,
      destination: tripData.destination,
      data: tripData.data
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving trip:', error);
    throw error;
  }

  return data;
}

// Update existing trip
export async function updateTrip(id: string, updates: UpdateTrip): Promise<Trip> {
  const { data, error } = await supabase
    .from('trips')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating trip:', error);
    throw error;
  }

  return data;
}

// Get all trips for a user
export async function getUserTrips(userId: string): Promise<Trip[]> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user trips:', error);
    throw error;
  }

  return data || [];
}

// Get a trip by its ID
export async function getTripById(tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned (record not found)
      return null;
    }
    console.error('Error fetching trip by ID:', error);
    throw error;
  }

  return data;
}

// Get a trip by its public URL ID
export async function getTripByPublicId(publicUrlId: string): Promise<Trip | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('public_url_id', publicUrlId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned (record not found)
      return null;
    }
    console.error('Error fetching trip by public ID:', error);
    throw error;
  }

  return data;
}

// Delete a trip
export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', tripId);

  if (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
}