import { energyBalance, essentialWatts, usableBatteryKwh } from '../src/lib/energy.ts';

const round = n => Math.round(n * 100) / 100;
// Merge recurring daily intervals, including cuts that cross midnight.
export function outageHours(cuts) {
  const intervals = cuts.flatMap(c => {
    const [h, m] = c.start.split(':').map(Number);
    const start = h + m / 60, end = start + c.durationHours;
    return end <= 24 ? [[start, end]] : [[start, 24], [0, end - 24]];
  }).sort((a, b) => a[0] - b[0]);
  let end = 0, total = 0;
  for (const [a, b] of intervals) { total += Math.max(0, b - Math.max(a, end)); end = Math.max(end, b); }
  return total;
}
export function simulateEvent(home, event) {
  const watts = essentialWatts(home.appliances) + event.extras.reduce((s, a) => s + a.watts, 0);
  const available = usableBatteryKwh(home.system);
  const needed = watts * event.hours / 1000;
  return { title: event.title, watts, availableKwh: round(available), neededKwh: round(needed), shortfallKwh: round(Math.max(0, needed - available)), overloaded: watts > home.system.inverterKw * 1000,
    feasible: needed <= available && watts <= home.system.inverterKw * 1000,
    assumptions: 'Battery-only scenario; essentials and extras run throughout, no recharge, no conversion losses or starting surges modeled. An estimate, not a guarantee.' };
}
export function makePlan(home, revision) {
  const balance = energyBalance(home.system, home.appliances);
  const watts = essentialWatts(home.appliances);
  const available = usableBatteryKwh(home.system);
  const need = watts * outageHours(home.cuts) / 1000;
  const alerts = [];
  if (!home.setupDone) alerts.push({ code: 'setup', tone: 'warn', text: 'Finish home setup before relying on these estimates.' });
  if (!home.appliances.length) alerts.push({ code: 'appliances', tone: 'warn', text: 'Add your appliances to estimate household demand.' });
  if (watts > home.system.inverterKw * 1000) alerts.push({ code: 'overload', tone: 'bad', text: 'Essential appliances exceed the entered inverter power limit.' });
  if (need > available) alerts.push({ code: 'backup', tone: 'bad', text: `Expected cuts need about ${round(need)} kWh for essentials; only ${round(available)} kWh is above reserve.` });
  if (balance.exceeds) alerts.push({ code: 'energy', tone: 'warn', text: `Daily use exceeds the estimated solar and current battery budget by ${Math.abs(balance.surplus)} kWh.` });
  return { version: 1, revision, generatedAt: new Date().toISOString(), source: 'manual', balance,
    backupHours: watts > 0 ? round(available * 1000 / watts) : null,
    outageHours: round(outageHours(home.cuts)), availableKwh: round(available), outageNeedKwh: round(need), alerts,
    flexible: home.appliances.filter(a => a.flexible).map(a => ({ id: a.id, name: a.name, hours: a.hoursPerDay, kwh: round(a.watts * a.hoursPerDay / 1000), exceedsInverter: a.watts > home.system.inverterKw * 1000 })),
    assumptions: ['Manual inputs, not live readings.', 'Daily totals are a budget, not proof that energy is available at each hour.', 'Overlapping recurring cuts are counted once. No recharge is assumed between cuts.', 'Backup assumes continuous essential use. Conversion losses, starting surges and battery power limits are not yet modeled.'],
    events: home.events.map(e => ({ id: e.id, ...simulateEvent(home, e) })) };
}
export function answerQuestion(home, question, revision) {
  const plan = makePlan(home, revision);
  const q = question.toLowerCase();
  let answer;
  if (/backup|battery|last|cut/.test(q)) answer = plan.backupHours === null ? 'Mark your essential appliances first so I can estimate backup time.' : `Your entered battery charge may cover continuous essential use for about ${plan.backupHours} hours before reserve. Expected cuts total ${plan.outageHours} hours. This assumes no recharge or conversion losses.`;
  else if (/event|guest|dinner/.test(q)) answer = 'Open Event planning, choose the extra appliances and duration, then calculate the battery-only scenario. Guest count alone does not tell us energy use.';
  else if (/\bac\b|air condition/.test(q)) { const ac = home.appliances.find(a => /\bac\b|air condition/i.test(a.name)); answer = ac ? `Your ${ac.name} is entered at ${ac.watts} W. One hour uses about ${round(ac.watts / 1000)} kWh. Add it to an event scenario to compare it with essentials and your battery reserve.` : 'Add your air conditioner with its running watts first. I cannot estimate its demand from its name alone.'; }
  else if (/wash|iron|pump|schedule|solar|sunny|flexible/.test(q)) {
    const names = home.appliances.filter(a => a.flexible).map(a => a.name);
    answer = (names.length ? `Your flexible appliances include ${names.join(', ')}. ` : 'Mark appliances as flexible in your appliance list first. ') + 'Consider using them during stronger solar hours, while checking your inverter limit. Actual timing depends on available sunlight and other loads.';
  }
  else answer = plan.alerts.map(a => a.text).join(' ') || `Daily use is ${plan.balance.load} kWh against estimated solar of ${plan.balance.solar} kWh. That daily budget does not guarantee power at every hour.`;
  return { answer, mode: 'rules', revision, disclaimer: 'Calculated guidance, not a connected AI model or hardware controller.' };
}
