/* 记住上次填写的 URL / Key / 模型名（存在本机 localStorage，仅自己可见） */
['url','key','model'].forEach(id => {
  const el = document.getElementById(id);
  const saved = localStorage.getItem('t_' + id);
  if (saved) el.value = saved;
  el.addEventListener('change', () => localStorage.setItem('t_' + id, el.value.trim()));
});

const out = document.getElementById('out');
const go  = document.getElementById('go');
function log(s){ out.textContent += s + "\n"; }
function base(){
  let u = document.getElementById('url').value.trim().replace(/\/+$/,'');
  if (!/\/v1$/i.test(u)) u += '/v1';
  return u;
}

go.onclick = async () => {
  const key = document.getElementById('key').value.trim();
  const wantModel = document.getElementById('model').value.trim();
  if (!key){ out.textContent = '请填写 API Key'; return; }
  out.textContent = ''; go.disabled = true;
  const H = { 'Authorization':'Bearer ' + key };

  /* ① 模型列表 */
  log('════════ ① GET ' + base() + '/models ════════');
  let ids = [];
  try{
    const r = await fetch(base() + '/models', { headers:H });
    const t = await r.text();
    log('HTTP ' + r.status);
    if (r.ok){
      const j = JSON.parse(t);
      ids = (j.data || []).map(m => m.id);
      if (ids.length){ log('该 Key 可用模型（共 ' + ids.length + ' 个）：'); ids.forEach(id => log('  ✔ ' + id)); }
      else log('（列表为空）');
    } else {
      log('返回：' + t.slice(0, 500));
      log('（若 401/403 = Key 无效；若 404 = 该服务无 /models 接口，可继续看 ②）');
    }
  }catch(e){
    log('请求异常：' + e.message + '（Failed to fetch = 跨域或网络问题）');
  }

  /* ② 对话测试 */
  const testModel = wantModel || ids[0];
  log('\n════════ ② POST ' + base() + '/chat/completions ════════');
  if (!testModel){
    log('未指定模型且列表为空，跳过对话测试。');
  } else {
    log('测试模型：' + testModel);
    try{
      const r = await fetch(base() + '/chat/completions', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...H },
        body: JSON.stringify({ model:testModel, messages:[{role:'user', content:'hi，回复一个字即可'}], max_tokens:1024, stream:false })
      });
      const t = await r.text();
      if (r.ok){
        const j = JSON.parse(t);
        const c = j.choices?.[0]?.message?.content || '(空回复)';
        log('✅ 对话成功 → ' + c.slice(0, 80));
      } else {
        log('❌ HTTP ' + r.status + ' ' + t.slice(0, 300));
        if (r.status === 404) log('（404 多半是模型名写错了，把 ① 列表里的真实名字复制过来再试）');
        if (r.status === 400) log('（400 多半是参数问题，如该模型限制 temperature 等）');
      }
    }catch(e){
      log('❌ 请求异常：' + e.message);
    }
  }

  log('\n════════ 检测完毕 ════════');
  go.disabled = false;
};
