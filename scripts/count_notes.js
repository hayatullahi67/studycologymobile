const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function countAll() {
  try {
    const { count: notesCount, error: notesError } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true });

    if (notesError) throw notesError;
    console.log(`TOTAL NOTES: ${notesCount}`);

    const { count: subjectsCount, error: subjectsError } = await supabase
      .from('subjects')
      .select('*', { count: 'exact', head: true });

    if (subjectsError) throw subjectsError;
    console.log(`TOTAL SUBJECTS: ${subjectsCount}`);

  } catch (err) {
    console.error('Error:', err);
  }
}

countAll();
