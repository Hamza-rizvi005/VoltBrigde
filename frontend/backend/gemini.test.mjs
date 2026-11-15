import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geminiAnswer } from './gemini.mjs';
import { blankHome } from './contracts.mjs';
test('Gemini relevance decision redirects unrelated responses', async () => {
 const r=await geminiAnswer(blankHome('home'),'write a romance',0,{key:'test',transport:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({relevant:false,answer:'irrelevant content'})}]}}]})})});
 assert.equal(r.mode,'gemini');assert.match(r.answer,/solar/);assert.ok(!r.answer.includes('irrelevant content'));
});
test('Gemini failures use clearly labeled fallback without leaking credentials',async()=>{
 const r=await geminiAnswer(blankHome('home'),'backup',0,{key:'test-secret',transport:async()=>{throw Error('test-secret')}});
 assert.equal(r.mode,'rules-fallback');assert.match(r.answer,/unavailable/);assert.ok(!JSON.stringify(r).includes('test-secret'));
});

test('missing or blank keys explicitly identify configuration and never call Google', async () => {
  const result = await geminiAnswer(blankHome('home'), 'backup', 0, { key: '  ', transport: () => { throw Error('Should not call'); } });
  assert.equal(result.connection, 'missing_key');
  assert.match(result.answer, /GEMINI_API_KEY/);
});
for (const [status, reason] of [[400,'invalid_request'],[401,'invalid_key'],[403,'access_denied'],[404,'model_unavailable'],[429,'quota_exceeded'],[503,'provider_unavailable']]) {
  test(`Gemini HTTP ${status} has actionable sanitized diagnostics`, async () => {
    const result = await geminiAnswer(blankHome('home'), 'backup', 0, { key: 'private-token', transport: async () => ({ ok: false, status }) });
    assert.equal(result.connection, reason);
    assert.equal(result.mode, 'rules-fallback');
    assert.ok(!JSON.stringify(result).includes('private-token'));
  });
}
test('truncated and malformed structured responses use labeled fallback', async () => {
  for (const candidate of [{finishReason:'MAX_TOKENS'}, {content:{parts:[{text:'invalid json'}]}}]) {
    const result = await geminiAnswer(blankHome('home'), 'backup', 0, { key:'test',transport:async()=>({ok:true,json:async()=>({candidates:[candidate]})}) });
    assert.equal(result.connection, 'invalid_response');
  }
});
