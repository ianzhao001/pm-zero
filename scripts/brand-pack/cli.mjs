#!/usr/bin/env node
import { checkBrandPack, initBrandPack, installBrandPack } from './core.mjs';

const usage = `Usage:
  node scripts/brand-pack/cli.mjs init <local-directory> --id <brand-id>
  node scripts/brand-pack/cli.mjs check <local-directory> [--base <neutral-deployment>] [--public-pack <same-brand-defaults>]
  node scripts/brand-pack/cli.mjs install <local-directory> --base <neutral-deployment> --dest <new-local-deployment> [--public-pack <same-brand-defaults>]
No install hooks or brand scripts are executed. API v1 composes one brand per deployment.`;
try {
  const [action, directory, ...args] = process.argv.slice(2);
  if (action === '--help') { console.log(usage); } else {
    if (!['init', 'check', 'install'].includes(action) || !directory || directory.startsWith('-')) throw new Error(usage);
    const allowed = { init: ['--id'], check: ['--base', '--public-pack'], install: ['--base', '--dest', '--public-pack'] }[action];
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      if (!allowed.includes(args[i]) || options[args[i]] || !args[i + 1] || args[i + 1].startsWith('-')) throw new Error(usage);
      options[args[i]] = args[i + 1];
    }
    if (action === 'init' && !options['--id'] || action === 'install' && (!options['--base'] || !options['--dest'])) throw new Error(usage);
    const result = action === 'init' ? await initBrandPack(directory, options['--id'])
      : action === 'check' ? await checkBrandPack({ pack: directory, publicPack: options['--public-pack'], base: options['--base'] })
        : await installBrandPack({ pack: directory, publicPack: options['--public-pack'], base: options['--base'], destination: options['--dest'] });
    console.log(JSON.stringify(result, null, 2));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
