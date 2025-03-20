export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      trips: {
        Row: {
          id: string
          user_id: string
          trip_title: string
          destination: string
          data: Json
          created_at: string
          updated_at: string
          public_url_id: string
        }
        Insert: {
          id?: string
          user_id: string
          trip_title: string
          destination: string
          data: Json
          created_at?: string
          updated_at?: string
          public_url_id?: string
        }
        Update: {
          id?: string
          user_id?: string
          trip_title?: string
          destination?: string
          data?: Json
          created_at?: string
          updated_at?: string
          public_url_id?: string
        }
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_session_id: string
          subscription_status: 'active' | 'canceled' | 'expired'
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_session_id: string
          subscription_status: 'active' | 'canceled' | 'expired'
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_session_id?: string
          subscription_status?: 'active' | 'canceled' | 'expired'
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Trip = Database['public']['Tables']['trips']['Row']
export type InsertTrip = Database['public']['Tables']['trips']['Insert']
export type UpdateTrip = Database['public']['Tables']['trips']['Update']

export type UserSubscription = Database['public']['Tables']['user_subscriptions']['Row']
export type InsertUserSubscription = Database['public']['Tables']['user_subscriptions']['Insert']
export type UpdateUserSubscription = Database['public']['Tables']['user_subscriptions']['Update']