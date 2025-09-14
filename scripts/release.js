#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, silent = false) {
  try {
    const result = execSync(command, { encoding: 'utf8' });
    if (!silent) {
      log(result.trim(), 'cyan');
    }
    return result.trim();
  } catch (error) {
    log(`Error executing: ${command}`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

async function getCurrentVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  return packageJson.version;
}

async function updateVersion(version) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  log(`✅ Updated package.json version to ${version}`, 'green');
}

async function createGitTag(version, message) {
  exec(`git add package.json package-lock.json`);
  exec(`git commit -m "chore: release v${version}"`);
  exec(`git tag -a v${version} -m "${message}"`);
  log(`✅ Created git tag v${version}`, 'green');
}

async function pushToGitHub() {
  exec('git push origin main');
  exec('git push origin --tags');
  log('✅ Pushed to GitHub', 'green');
}

async function main() {
  log('🚀 Bottleneck Release Script', 'bright');
  log('================================\n', 'bright');

  // Check if working directory is clean
  const gitStatus = exec('git status --porcelain', true);
  if (gitStatus && !gitStatus.includes('package.json')) {
    log('❌ Working directory is not clean. Please commit or stash changes.', 'red');
    process.exit(1);
  }

  // Get current version
  const currentVersion = await getCurrentVersion();
  log(`Current version: ${currentVersion}`, 'blue');

  // Ask for release type
  const releaseType = await question(`
Select release type:
1. Patch (bug fixes) - ${incrementVersion(currentVersion, 'patch')}
2. Minor (new features) - ${incrementVersion(currentVersion, 'minor')}
3. Major (breaking changes) - ${incrementVersion(currentVersion, 'major')}
4. Pre-release (beta/alpha)
5. Custom version

Enter choice (1-5): `);

  let newVersion;
  let isPrerelease = false;

  switch (releaseType) {
    case '1':
      newVersion = incrementVersion(currentVersion, 'patch');
      break;
    case '2':
      newVersion = incrementVersion(currentVersion, 'minor');
      break;
    case '3':
      newVersion = incrementVersion(currentVersion, 'major');
      break;
    case '4':
      isPrerelease = true;
      const prereleaseType = await question('Enter pre-release type (alpha/beta): ');
      const baseVersion = currentVersion.replace(/-.*$/, '');
      const prereleaseNumber = await question('Enter pre-release number (e.g., 1 for beta.1): ');
      newVersion = `${incrementVersion(baseVersion, 'patch')}-${prereleaseType}.${prereleaseNumber}`;
      break;
    case '5':
      newVersion = await question('Enter custom version: ');
      break;
    default:
      log('Invalid choice', 'red');
      process.exit(1);
  }

  log(`\nNew version will be: ${newVersion}`, 'yellow');

  // Confirm release
  const confirm = await question(`\nDo you want to proceed with the release? (y/n): `);
  if (confirm.toLowerCase() !== 'y') {
    log('Release cancelled', 'yellow');
    process.exit(0);
  }

  // Get release notes
  log('\nEnter release notes (press Enter twice when done):', 'blue');
  let releaseNotes = '';
  let emptyLineCount = 0;
  
  while (emptyLineCount < 2) {
    const line = await question('');
    if (line === '') {
      emptyLineCount++;
    } else {
      emptyLineCount = 0;
      releaseNotes += line + '\n';
    }
  }

  // Update version
  await updateVersion(newVersion);

  // Update package-lock.json
  exec('npm install', true);

  // Create git tag
  await createGitTag(newVersion, releaseNotes || `Release v${newVersion}`);

  // Ask to push
  const shouldPush = await question('\nPush to GitHub and trigger release? (y/n): ');
  if (shouldPush.toLowerCase() === 'y') {
    await pushToGitHub();
    log('\n✨ Release process initiated!', 'green');
    log(`GitHub Actions will now build and publish the release.`, 'green');
    log(`Monitor progress at: https://github.com/[owner]/bottleneck/actions`, 'blue');
  } else {
    log('\nRelease prepared locally. To push later, run:', 'yellow');
    log('  git push origin main', 'cyan');
    log('  git push origin --tags', 'cyan');
  }

  rl.close();
}

function incrementVersion(version, type) {
  const parts = version.replace(/-.*$/, '').split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      return version;
  }
}

// Run the script
main().catch((error) => {
  log(`Error: ${error.message}`, 'red');
  process.exit(1);
});