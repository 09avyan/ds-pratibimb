// Host → Animations: per-animation switches are stored, merged, validated and kept out of nothing else.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const E = require('../src/game/engine.ts');
const { ANIMATIONS, animationOffClasses, animationOn } = require('../src/game/animations.ts');
const w = E.freshWorld('live', Date.now());
E.hostAction(w, 'controls', { animations: { confetti: false, crown: false } });
E.hostAction(w, 'controls', { animations: { crown: true, notAnAnimation: false, countdown: 'off' } });
assert.deepEqual(w.controls.animations, { confetti: false, crown: true }, 'switches merge; unknown keys and non-boolean values are ignored');
assert.equal(animationOn(w.controls.animations, 'confetti'), false);
assert.equal(animationOn(w.controls.animations, 'countdown'), true, 'a missing switch means on');
assert.equal(animationOffClasses(w.controls.animations), ' off-confetti');
assert.equal(E.toPublic(w).controls.animations.confetti, false, 'screens receive the switches');
assert.equal(new Set(ANIMATIONS.map(a => a.key)).size, ANIMATIONS.length, 'keys are unique');
console.log(`PASS: ${ANIMATIONS.length} animation switches (${ANIMATIONS.filter(a => a.screen === 'audience').length} audience, ${ANIMATIONS.filter(a => a.screen === 'trading').length} trading) store, merge and validate.`);
