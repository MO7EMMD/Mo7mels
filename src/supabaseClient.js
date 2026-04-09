import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sygxmbqvtcxjwjabnbpa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Z3htYnF2dGN4andqYWJuYnBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTk2MjQsImV4cCI6MjA5MTI3NTYyNH0.WQv7YYe1XDc3Z9Yf8ayl0-oEji2fQNuhGiLj-m-qTew'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)