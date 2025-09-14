#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

function getCurrentVersion() {
  return packageJson.version;
}

function getVersionType(version) {
  if (version.includes('alpha')) return 'alpha';
  if (version.includes('beta')) return 'beta';
  if (version.includes('rc')) return 'rc';
  return 'release';
}

function bumpVersion(type) {
  const currentVersion = getCurrentVersion();
  const versionParts = currentVersion.split('.');
  const major = parseInt(versionParts[0]);
  const minor = parseInt(versionParts[1]);
  const patch = parseInt(versionParts[2]);

  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    case 'alpha':
      newVersion = `${major}.${minor}.${patch}-alpha.1`;
      break;
    case 'beta':
      newVersion = `${major}.${minor}.${patch}-beta.1`;
      break;
    case 'rc':
      newVersion = `${major}.${minor}.${patch}-rc.1`;
      break;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }

  return newVersion;
}

function updatePackageJson(version) {
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
}

function createGitTag(version) {
  const tagName = `v${version}`;
  try {
    execSync(`git tag -a ${tagName} -m "Release ${version}"`, { stdio: 'inherit' });
    console.log(`Created git tag: ${tagName}`);
  } catch (error) {
    console.error('Failed to create git tag:', error.message);
    process.exit(1);
  }
}

function generateChangelog(version) {
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
  let changelog = '';
  
  if (fs.existsSync(changelogPath)) {
    changelog = fs.readFileSync(changelogPath, 'utf8');
  }

  // Get commits since last tag
  let commits;
  try {
    const lastTag = execSync('git describe --tags --abbrev=0 HEAD~1 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
    if (lastTag) {
      commits = execSync(`git log --pretty=format:"- %s (%h)" ${lastTag}..HEAD`, { encoding: 'utf8' });
    } else {
      commits = execSync('git log --pretty=format:"- %s (%h)" --max-count=50', { encoding: 'utf8' });
    }
  } catch (error) {
    commits = 'No commits found';
  }

  const versionType = getVersionType(version);
  const isPrerelease = versionType !== 'release';
  
  const newEntry = `## [${version}] - ${new Date().toISOString().split('T')[0]}

${commits}

${isPrerelease ? `\n> **Note**: This is a ${versionType} release.` : ''}

`;

  const updatedChangelog = newEntry + (changelog.startsWith('#') ? changelog : `# Changelog\n\n${changelog}`);
  fs.writeFileSync(changelogPath, updatedChangelog);
  console.log('Updated CHANGELOG.md');
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0];

  if (!versionType) {
    console.log('Usage: node scripts/version.js <type>');
    console.log('Types: major, minor, patch, alpha, beta, rc');
    console.log(`Current version: ${getCurrentVersion()}`);
    process.exit(1);
  }

  try {
    const newVersion = bumpVersion(versionType);
    console.log(`Bumping version from ${getCurrentVersion()} to ${newVersion}`);
    
    updatePackageJson(newVersion);
    generateChangelog(newVersion);
    
    if (versionType === 'release' || versionType === 'patch' || versionType === 'minor' || versionType === 'major') {
      createGitTag(newVersion);
      console.log(`\nVersion ${newVersion} created successfully!`);
      console.log('To publish the release, push the tag:');
      console.log(`git push origin v${newVersion}`);
    } else {
      console.log(`\nPrerelease version ${newVersion} created successfully!`);
      console.log('To publish the prerelease, push the tag:');
      console.log(`git push origin v${newVersion}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  getCurrentVersion,
  bumpVersion,
  updatePackageJson,
  generateChangelog
};