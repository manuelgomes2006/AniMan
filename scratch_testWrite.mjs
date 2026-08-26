const url = 'https://gxcflibgvgvnwhngxygl.supabase.co';
const key = 'sb_publishable_bMPUv__U73SLnCBgs6Ab9g_VgXiJZZ2';

async function test() {
  const existingUserId = '4d720f88-460d-48fb-8855-6f010251009e';

  // 1. Query profiles for this user
  const profileResp = await fetch(`${url}/rest/v1/profiles?id=eq.${existingUserId}&select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('Profile:', await profileResp.json());

  // 2. Query user_preferences for this user
  const prefResp = await fetch(`${url}/rest/v1/user_preferences?user_id=eq.${existingUserId}&select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  console.log('User Preferences:', await prefResp.json());
}

test();
