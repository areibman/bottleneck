#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');
const PACKAGE_PATH = path.join(__dirname, '..', 'package.json');

/**
 * Execute command and return output
 */
function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Get the current version from package.json
 */
async function getCurrentVersion() {
  const packageJson = JSON.parse(await readFile(PACKAGE_PATH, 'utf8'));
  return packageJson.version;
}

/**
 * Update version in package.json
 */
async function updateVersion(newVersion) {
  const packageJson = JSON.parse(await readFile(PACKAGE_PATH, 'utf8'));
  packageJson.version = newVersion;
  await writeFile(PACKAGE_PATH, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Updated package.json version to ${newVersion}`);
}

/**
 * Get git commits since last tag
 */
function getCommitsSinceLastTag() {
  try {
    const lastTag = exec('git describe --tags --abbrev=0 2>/dev/null || echo ""');
    if (!lastTag) {
      return exec('git log --pretty=format:"%h %s" --reverse');
    }
    return exec(`git log ${lastTag}..HEAD --pretty=format:"%h %s" --reverse`);
  } catch (error) {
    return '';
  }
}

/**
 * Get merged PRs since last tag
 */
function getMergedPRsSinceLastTag() {
  try {
    const lastTag = exec('git describe --tags --abbrev=0 2>/dev/null || echo ""');
    if (!lastTag) {
      return exec('git log --grep="Merge pull request" --pretty=format:"%s" --reverse');
    }
    return exec(`git log ${lastTag}..HEAD --grep="Merge pull request" --pretty=format:"%s" --reverse`);
  } catch (error) {
    return '';
  }
}

/**
 * Generate changelog content
 */
async function generateChangelog(version) {
  const currentDate = new Date().toISOString().split('T')[0];
  const commits = getCommitsSinceLastTag();
  const prs = getMergedPRsSinceLastTag();
  
  let changelog = `## [${version}] - ${currentDate}\n\n`;
  
  if (prs) {
    changelog += '### Merged Pull Requests\n';
    prs.split('\n').forEach(pr => {
      if (pr.trim()) {
        changelog += `- ${pr.trim()}\n`;
      }
    });
    changelog += '\n';
  }
  
  if (commits) {
    changelog += '### Changes\n';
    commits.split('\n').forEach(commit => {
      if (commit.trim() && !commit.includes('Merge pull request')) {
        changelog += `- ${commit.trim()}\n`;
      }
    });
    changelog += '\n';
  }
  
  return changelog;
}

/**
 * Update CHANGELOG.md
 */
async function updateChangelog(version) {
  const newContent = await generateChangelog(version);
  
  let existingContent = '';
  try {
    existingContent = await readFile(CHANGELOG_PATH, 'utf8');
  } catch (error) {
    // File doesn't exist, create header
    existingContent = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
  }
  
  // Insert new content after the header
  const lines = existingContent.split('\n');
  const headerEndIndex = lines.findIndex(line => line.startsWith('## '));
  
  if (headerEndIndex === -1) {
    // No existing releases, add after header
    const headerLines = lines.slice(0, 3);
    const restLines = lines.slice(3);
    const updatedContent = [
      ...headerLines,
      '',
      newContent.trim(),
      '',
      ...restLines
    ].join('\n');
    await writeFile(CHANGELOG_PATH, updatedContent);
  } else {
    // Insert before first existing release
    const beforeLines = lines.slice(0, headerEndIndex);
    const afterLines = lines.slice(headerEndIndex);
    const updatedContent = [
      ...beforeLines,
      newContent.trim(),
      '',
      ...afterLines
    ].join('\n');
    await writeFile(CHANGELOG_PATH, updatedContent);
  }
  
  console.log(`Updated CHANGELOG.md with version ${version}`);
}

/**
 * Increment version based on type
 */
function incrementVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error('Invalid version type. Use: major, minor, or patch');
  }
}

/**
 * Create git tag
 */
function createGitTag(version) {
  exec(`git add .`);
  exec(`git commit -m "Release v${version}"`);
  exec(`git tag -a v${version} -m "Release v${version}"`);
  console.log(`Created git tag v${version}`);
}

/**
 * Main release function
 */
async function release() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node scripts/release.js <type> [options]

Types:
  major    Increment major version (1.0.0 -> 2.0.0)
  minor    Increment minor version (1.0.0 -> 1.1.0)
  patch    Increment patch version (1.0.0 -> 1.0.1)
  <version>  Set specific version (e.g., 1.2.3)

Options:
  --no-tag    Don't create git tag
  --dry-run   Show what would be done without making changes

Examples:
  node scripts/release.js patch
  node scripts/release.js minor --no-tag
  node scripts/release.js 1.2.3 --dry-run
    `);
    process.exit(1);
  }
  
  const versionArg = args[0];
  const noTag = args.includes('--no-tag');
  const dryRun = args.includes('--dry-run');
  
  const currentVersion = await getCurrentVersion();
  console.log(`Current version: ${currentVersion}`);
  
  let newVersion;
  if (['major', 'minor', 'patch'].includes(versionArg)) {
    newVersion = incrementVersion(currentVersion, versionArg);
  } else if (/^\d+\.\d+\.\d+$/.test(versionArg)) {
    newVersion = versionArg;
  } else {
    console.error('Invalid version format. Use semantic versioning (e.g., 1.2.3) or type (major/minor/patch)');
    process.exit(1);
  }
  
  console.log(`New version: ${newVersion}`);
  
  if (dryRun) {
    console.log('\n--- DRY RUN ---');
    console.log('Would update package.json version');
    console.log('Would update CHANGELOG.md');
    if (!noTag) {
      console.log('Would create git tag');
    }
    console.log('\nChangelog preview:');
    console.log(await generateChangelog(newVersion));
    return;
  }
  
  // Check for uncommitted changes
  try {
    const status = exec('git status --porcelain');
    if (status && !args.includes('--force')) {
      console.error('Working directory is not clean. Commit your changes first or use --force');
      process.exit(1);
    }
  } catch (error) {
    console.warn('Could not check git status');
  }
  
  // Update version and changelog
  await updateVersion(newVersion);
  await updateChangelog(newVersion);
  
  // Create git tag if requested
  if (!noTag) {
    createGitTag(newVersion);
    console.log(`
Release ${newVersion} prepared successfully!

Next steps:
1. Push the tag to trigger the release workflow:
   git push origin v${newVersion}

2. Or push everything at once:
   git push origin main --tags
    `);
  } else {
    console.log(`
Release ${newVersion} prepared successfully!

Git tag was not created (--no-tag flag used).
Create and push the tag manually when ready:
  git tag -a v${newVersion} -m "Release v${newVersion}"
  git push origin v${newVersion}
    `);
  }
}

// Run the release script
if (require.main === module) {
  release().catch(error => {
    console.error('Release failed:', error);
    process.exit(1);
  });
}

module.exports = { release, incrementVersion, generateChangelog };