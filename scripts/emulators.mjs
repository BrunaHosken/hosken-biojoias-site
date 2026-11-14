import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { javaEnvironment } from './java.mjs';
const test = process.argv.includes('--test');
const args = test ? ['exec','--','firebase','emulators:exec','--project','demo-hosken','--only','firestore','node --test tests/firestore.test.mjs'] : ['exec','--','firebase','emulators:start','--project','demo-hosken','--only','auth,firestore','--export-on-exit=.emulator-data'];
if (!test && existsSync('.emulator-data/firebase-export-metadata.json')) args.push('--import=.emulator-data');
const child = spawn('npm', args, {stdio:'inherit',env:javaEnvironment()});
// Ctrl+C é enviado ao grupo de processos; aguardar a exportação do Firebase.
process.on('SIGINT',()=>{});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code ?? 1;});
