#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Version bump script for semantic versioning
 * Usage: node version-bump.js [major|minor|patch|beta|alpha]
 */

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');

function readPackageJson() {
  const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf8');
  return JSON.parse(content);
}

function writePackageJson(packageJson) {
  fs.writeFileSync(
    PACKAGE_JSON_PATH,
    JSON.stringify(packageJson, null, 2) + '\n'
  );
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    prereleaseVersion: match[5] ? parseInt(match[5], 10) : null,
  };
}

function formatVersion(versionObj) {
  let version = `${versionObj.major}.${versionObj.minor}.${versionObj.patch}`;
  if (versionObj.prerelease) {
    version += `-${versionObj.prerelease}.${versionObj.prereleaseVersion}`;
  }
  return version;
}

function bumpVersion(currentVersion, bumpType) {
  const version = parseVersion(currentVersion);

  switch (bumpType) {
    case 'major':
      version.major += 1;
      version.minor = 0;
      version.patch = 0;
      version.prerelease = null;
      version.prereleaseVersion = null;
      break;

    case 'minor':
      version.minor += 1;
      version.patch = 0;
      version.prerelease = null;
      version.prereleaseVersion = null;
      break;

    case 'patch':
      version.patch += 1;
      version.prerelease = null;
      version.prereleaseVersion = null;
      break;

    case 'beta':
      if (version.prerelease === 'beta') {
        version.prereleaseVersion += 1;
      } else {
        version.patch += 1;
        version.prerelease = 'beta';
        version.prereleaseVersion = 1;
      }
      break;

    case 'alpha':
      if (version.prerelease === 'alpha') {
        version.prereleaseVersion += 1;
      } else {
        version.patch += 1;
        version.prerelease = 'alpha';
        version.prereleaseVersion = 1;
      }
      break;

    default:
      throw new Error(
        `Invalid bump type: ${bumpType}. Use major, minor, patch, beta, or alpha.`
      );
  }

  return formatVersion(version);
}

function gitCommitAndTag(version) {
  try {
    // Check if git is available
    execSync('git --version', { stdio: 'ignore' });

    // Check if there are changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    
    if (status.includes('package.json')) {
      // Stage package.json
      execSync('git add package.json', { stdio: 'inherit' });
      
      // Commit
      execSync(`git commit -m "chore: bump version to ${version}"`, {
        stdio: 'inherit',
      });
      
      console.log(`✓ Created commit for version ${version}`);
    }

    // Create tag
    execSync(`git tag -a v${version} -m "Release v${version}"`, {
      stdio: 'inherit',
    });
    
    console.log(`✓ Created tag v${version}`);
    console.log('\nTo push the changes and tag, run:');
    console.log(`  git push origin main`);
    console.log(`  git push origin v${version}`);
    console.log('\nOr push both at once:');
    console.log(`  git push origin main --tags`);
  } catch (error) {
    console.error('Warning: Git operations failed:', error.message);
    console.log('You may need to commit and tag manually.');
  }
}

function main() {
  const bumpType = process.argv[2];

  if (!bumpType) {
    console.error('Error: Bump type is required.');
    console.error('Usage: node version-bump.js [major|minor|patch|beta|alpha]');
    console.error('\nExamples:');
    console.error('  node version-bump.js patch   # 1.0.0 -> 1.0.1');
    console.error('  node version-bump.js minor   # 1.0.0 -> 1.1.0');
    console.error('  node version-bump.js major   # 1.0.0 -> 2.0.0');
    console.error('  node version-bump.js beta    # 1.0.0 -> 1.0.1-beta.1');
    console.error('  node version-bump.js alpha   # 1.0.0 -> 1.0.1-alpha.1');
    process.exit(1);
  }

  try {
    const packageJson = readPackageJson();
    const currentVersion = packageJson.version;
    const newVersion = bumpVersion(currentVersion, bumpType);

    console.log(`Current version: ${currentVersion}`);
    console.log(`New version: ${newVersion}`);
    console.log('');

    // Update package.json
    packageJson.version = newVersion;
    writePackageJson(packageJson);
    console.log('✓ Updated package.json');

    // Git operations
    gitCommitAndTag(newVersion);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
