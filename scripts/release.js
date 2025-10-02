#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

/**
 * Interactive release script
 * Guides through the release process
 */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function exec(command, description) {
  console.log(`\n→ ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log('✓ Done');
    return true;
  } catch (error) {
    console.error('✗ Failed');
    return false;
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Bottleneck Release Manager          ║');
  console.log('╚═══════════════════════════════════════╝\n');

  // Check git status
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('⚠️  Warning: You have uncommitted changes.');
      const answer = await question(
        'Do you want to continue? (yes/no): '
      );
      if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
        console.log('Release cancelled.');
        rl.close();
        return;
      }
    }
  } catch (error) {
    console.error('Error checking git status:', error.message);
    rl.close();
    return;
  }

  // Ask for version bump type
  console.log('\nWhat type of release is this?');
  console.log('  1. Patch (bug fixes)       - 0.1.5 → 0.1.6');
  console.log('  2. Minor (new features)    - 0.1.5 → 0.2.0');
  console.log('  3. Major (breaking changes)- 0.1.5 → 1.0.0');
  console.log('  4. Beta (pre-release)      - 0.1.5 → 0.1.6-beta.1');
  console.log('  5. Alpha (early pre-release)- 0.1.5 → 0.1.6-alpha.1');
  console.log('  6. Cancel');

  const choice = await question('\nEnter your choice (1-6): ');

  let bumpType;
  switch (choice) {
    case '1':
      bumpType = 'patch';
      break;
    case '2':
      bumpType = 'minor';
      break;
    case '3':
      bumpType = 'major';
      break;
    case '4':
      bumpType = 'beta';
      break;
    case '5':
      bumpType = 'alpha';
      break;
    case '6':
      console.log('Release cancelled.');
      rl.close();
      return;
    default:
      console.log('Invalid choice. Release cancelled.');
      rl.close();
      return;
  }

  // Show current version
  const packageJson = require('../package.json');
  console.log(`\nCurrent version: ${packageJson.version}`);

  // Bump version
  if (!exec(`node scripts/version-bump.js ${bumpType}`, 'Bumping version')) {
    rl.close();
    return;
  }

  // Get new version
  const newPackageJson = require('../package.json');
  console.log(`\n✨ Version bumped to: ${newPackageJson.version}`);

  // Confirm before pushing
  const confirmPush = await question(
    '\nDo you want to push the tag to trigger the release workflow? (yes/no): '
  );

  if (confirmPush.toLowerCase() === 'yes' || confirmPush.toLowerCase() === 'y') {
    // Push commits
    exec('git push origin main', 'Pushing commits');

    // Push tags
    exec(`git push origin v${newPackageJson.version}`, 'Pushing tag');

    console.log('\n╔═══════════════════════════════════════╗');
    console.log('║   Release Process Initiated!          ║');
    console.log('╚═══════════════════════════════════════╝');
    console.log('\n✨ GitHub Actions will now build and publish the release.');
    console.log(
      `\nMonitor the progress at:\nhttps://github.com/yourusername/bottleneck/actions`
    );
    console.log(
      `\nOnce complete, the release will be available at:\nhttps://github.com/yourusername/bottleneck/releases/tag/v${newPackageJson.version}`
    );
  } else {
    console.log('\n📦 Version updated locally but not pushed.');
    console.log('To push manually, run:');
    console.log('  git push origin main --tags');
  }

  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
