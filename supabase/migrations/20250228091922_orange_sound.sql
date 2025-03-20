/*
  # Create trips table for storing user travel plans

  1. New Tables
    - `trips` 
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `trip_title` (text)
      - `destination` (text)
      - `data` (jsonb - stores all travel suggestions)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `public_url_id` (uuid, unique - used for sharing)

  2. Security
    - Enable RLS on `trips` table
    - Add policies for:
      - Users to read/write their own trips
      - Anyone to read public trips by URL
*/

-- Create trips table to store all travel plans
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_title text NOT NULL,
  destination text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public_url_id uuid DEFAULT gen_random_uuid() UNIQUE,
  
  -- Add constraint so we can find trips by public URL
  CONSTRAINT trips_public_url_id_unique UNIQUE (public_url_id)
);

-- Enable Row Level Security
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
-- Users can view their own trips
CREATE POLICY "Users can view their own trips"
  ON trips
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own trips
CREATE POLICY "Users can insert their own trips"
  ON trips
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own trips
CREATE POLICY "Users can update their own trips"
  ON trips
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own trips
CREATE POLICY "Users can delete their own trips"
  ON trips
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public access policy for shared trips
CREATE POLICY "Anyone can view trips by public URL"
  ON trips
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set updated_at on update
CREATE TRIGGER trips_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();