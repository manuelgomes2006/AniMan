import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';

const url = 'https://gxcflibgvgvnwhngxygl.supabase.co';
const key = 'sb_publishable_bMPUv__U73SLnCBgs6Ab9g_VgXiJZZ2';

const supabase = createClient(url, key);

async function run() {
  console.log('Testing user_preferences upsert with authenticated session...');

  const testEmail = `test_audio_${Date.now()}@aniworld.io`;
  const testPass = 'TestAudioPassword123!';

  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPass,
    options: {
      data: {
        username: `testaudio_${Date.now()}`
      }
    }
  });

  if (signUpErr) {
    console.error('Sign up error:', signUpErr);
    return;
  }

  const session = signUpData.session;
  console.log('Session object present?:', Boolean(session));
  console.log('User ID:', signUpData.user?.id);

  let activeClient = supabase;

  if (session) {
    activeClient = createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    });
  } else {
    console.log('Email confirmation may be required or session null. Trying signInWithPassword...');
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPass
    });
    if (signInErr) {
      console.error('SignIn error:', signInErr);
      return;
    }
    activeClient = createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${signInData.session.access_token}`
        }
      }
    });
  }

  const userId = signUpData.user.id;

  // 1. Try Upsert user_preferences
  console.log('1. Upserting preferred_audio = dub...');
  const { data: upsertData, error: upsertErr } = await activeClient
    .from('user_preferences')
    .upsert({
      user_id: userId,
      preferred_audio: 'dub',
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  console.log('Upsert error:', upsertErr);

  // 2. Select user_preferences
  const { data: selectData, error: selectErr } = await activeClient
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId);

  console.log('Selected preferences from DB:', selectData, selectErr);
}

run();
