const path = require('path');
const fs = require('fs');

const srcPath = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\01661172-5e8f-4634-8898-b794c77633d8\\media__1781765159974.png';
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

if (!supabaseUrl || !supabaseKey) {
  console.error('Could not load Supabase config from .env');
  process.exit(1);
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSupabaseData() {
  try {
    // 1. Get all unique subject names from notes table
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('id, title, subject, topic, subject_id, topic_id');

    if (notesError) throw notesError;

    console.log(`Total notes found in Supabase: ${notes.length}`);

    // Group notes by subject
    const bySubject = {};
    notes.forEach(note => {
      const sub = note.subject || 'Unknown';
      if (!bySubject[sub]) bySubject[sub] = [];
      bySubject[sub].push(note);
    });

    console.log('\n--- Notes by Subject in Supabase ---');
    for (const [sub, list] of Object.entries(bySubject)) {
      const uniqueTopics = new Set(list.map(n => n.topic || 'General'));
      console.log(`- "${sub}": ${list.length} notes, ${uniqueTopics.size} unique topics`);
    }

    // 2. Look closely at Christian Religious Knowledge/Studies/CRS/CRK
    console.log('\n--- Detail of Christian Religious Knowledge/Studies/CRS/CRK notes ---');
    const crNotes = notes.filter(n => {
      const s = (n.subject || '').toLowerCase();
      return s.includes('christian') || s.includes('religious') || s.includes('crs') || s.includes('crk');
    });

    console.log(`Found ${crNotes.length} matching notes.`);
    const uniqueCrTopics = {};
    crNotes.forEach(n => {
      const topicName = n.topic || 'General';
      if (!uniqueCrTopics[topicName]) uniqueCrTopics[topicName] = [];
      uniqueCrTopics[topicName].push(n.title);
    });

    console.log(`Unique topics count: ${Object.keys(uniqueCrTopics).length}`);
    Object.entries(uniqueCrTopics).forEach(([topic, titles], index) => {
      console.log(`  ${index + 1}. "${topic}" (${titles.length} notes: ${titles.slice(0, 2).join(', ')}${titles.length > 2 ? '...' : ''})`);
    });

    // 3. Check subjects table in Supabase
    const { data: subjects, error: subError } = await supabase
      .from('subjects')
      .select('id, name');

    if (subError) throw subError;
    console.log('\n--- Subjects in Supabase ---');
    subjects.forEach(s => {
      console.log(`- ID: ${s.id}, Name: "${s.name}"`);
    });

  } catch (err) {
    console.error('Error:', err);
  }
}

checkSupabaseData();
