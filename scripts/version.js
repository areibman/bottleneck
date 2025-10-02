#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const versionType = args[1];

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

function getCurrentVersion() {
  return packageJson.version;
}

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3]),
    prerelease: match[4] || null,
    toString() {
      let v = `${this.major}.${this.minor}.${this.patch}`;
      if (this.prerelease) {
        v += `-${this.prerelease}`;
      }
      return v;
    }
  };
}

function incrementVersion(currentVersion, type) {
  const version = parseVersion(currentVersion);
  
  switch (type) {
    case 'major':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      version.prerelease = null;
      break;
      
    case 'minor':
      version.minor++;
      version.patch = 0;
      version.prerelease = null;
      break;
      
    case 'patch':
      version.patch++;
      version.prerelease = null;
      break;
      
    case 'premajor':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      version.prerelease = 'beta.0';
      break;
      
    case 'preminor':
      version.minor++;
      version.patch = 0;
      version.prerelease = 'beta.0';
      break;
      
    case 'prepatch':
      version.patch++;
      version.prerelease = 'beta.0';
      break;
      
    case 'prerelease':
      if (version.prerelease) {
        // Increment prerelease version
        const match = version.prerelease.match(/^(.+?)\.(\d+)$/);
        if (match) {
          const prereleaseType = match[1];
          const prereleaseNumber = parseInt(match[2]) + 1;
          version.prerelease = `${prereleaseType}.${prereleaseNumber}`;
        } else {
          version.prerelease = `${version.prerelease}.1`;
        }
      } else {
        version.prerelease = 'beta.0';
      }
      break;
      
    case 'alpha':
      if (version.prerelease && version.prerelease.startsWith('alpha')) {
        const match = version.prerelease.match(/^alpha\.(\d+)$/);
        if (match) {
          const alphaNumber = parseInt(match[1]) + 1;
          version.prerelease = `alpha.${alphaNumber}`;
        }
      } else {
        version.patch++;
        version.prerelease = 'alpha.0';
      }
      break;
      
    case 'beta':
      if (version.prerelease && version.prerelease.startsWith('beta')) {
        const match = version.prerelease.match(/^beta\.(\d+)$/);
        if (match) {
          const betaNumber = parseInt(match[1]) + 1;
          version.prerelease = `beta.${betaNumber}`;
        }
      } else if (version.prerelease && version.prerelease.startsWith('alpha')) {
        // Promote from alpha to beta
        version.prerelease = 'beta.0';
      } else {
        version.patch++;
        version.prerelease = 'beta.0';
      }
      break;
      
    case 'release':
      // Remove prerelease tag
      version.prerelease = null;
      break;
      
    default:
      throw new Error(`Unknown version type: ${type}`);
  }
  
  return version.toString();
}

function updateVersion(newVersion) {
  // Update package.json
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ Updated version to ${newVersion}`);
  
  // Update package-lock.json if it exists
  const packageLockPath = path.join(__dirname, '..', 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
    packageLock.version = newVersion;
    if (packageLock.packages && packageLock.packages['']) {
      packageLock.packages[''].version = newVersion;
    }
    fs.writeFileSync(packageLockPath, JSON.stringify(packageLock, null, 2) + '\n');
    console.log('✅ Updated package-lock.json');
  }
}

function createGitTag(version) {
  try {
    // Check if we have uncommitted changes
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.log('⚠️  You have uncommitted changes. Committing version bump...');
      execSync('git add package.json package-lock.json', { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' });
    }
    
    // Create tag
    const tagName = `v${version}`;
    execSync(`git tag -a ${tagName} -m "Release ${version}"`, { stdio: 'inherit' });
    console.log(`✅ Created git tag: ${tagName}`);
    
    // Push changes and tag
    console.log('📤 Pushing to remote...');
    execSync('git push', { stdio: 'inherit' });
    execSync('git push --tags', { stdio: 'inherit' });
    console.log('✅ Pushed changes and tags to remote');
    
  } catch (error) {
    console.error('❌ Git operations failed:', error.message);
    console.log('💡 You can manually run:');
    console.log(`   git add package.json package-lock.json`);
    console.log(`   git commit -m "chore: bump version to ${version}"`);
    console.log(`   git tag -a v${version} -m "Release ${version}"`);
    console.log(`   git push && git push --tags`);
  }
}

function showHelp() {
  console.log(`
Bottleneck Version Management Tool

Usage:
  node scripts/version.js <command> [options]

Commands:
  current                    Show current version
  bump <type>               Bump version and create git tag
  set <version>             Set specific version
  tag                       Create git tag for current version
  help                      Show this help message

Version Types:
  major                     1.0.0 -> 2.0.0
  minor                     1.0.0 -> 1.1.0
  patch                     1.0.0 -> 1.0.1
  premajor                  1.0.0 -> 2.0.0-beta.0
  preminor                  1.0.0 -> 1.1.0-beta.0
  prepatch                  1.0.0 -> 1.0.1-beta.0
  prerelease                1.0.0-beta.0 -> 1.0.0-beta.1
  alpha                     1.0.0 -> 1.0.1-alpha.0
  beta                      1.0.0 -> 1.0.1-beta.0
  release                   1.0.0-beta.0 -> 1.0.0

Examples:
  node scripts/version.js current
  node scripts/version.js bump patch
  node scripts/version.js bump minor
  node scripts/version.js bump beta
  node scripts/version.js set 2.0.0
  node scripts/version.js tag
`);
}

// Main execution
async function main() {
  try {
    switch (command) {
      case 'current':
        console.log(`Current version: ${getCurrentVersion()}`);
        break;
        
      case 'bump':
        if (!versionType) {
          console.error('❌ Please specify version type');
          showHelp();
          process.exit(1);
        }
        const currentVersion = getCurrentVersion();
        const newVersion = incrementVersion(currentVersion, versionType);
        console.log(`Bumping version: ${currentVersion} -> ${newVersion}`);
        updateVersion(newVersion);
        
        // Ask if user wants to create git tag
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        readline.question('Create git tag and push? (y/n) ', (answer) => {
          readline.close();
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            createGitTag(newVersion);
          } else {
            console.log('Skipped git operations. Run "npm run version:tag" to create tag later.');
          }
        });
        break;
        
      case 'set':
        if (!versionType) {
          console.error('❌ Please specify version');
          showHelp();
          process.exit(1);
        }
        // Validate version format
        try {
          parseVersion(versionType);
        } catch (error) {
          console.error(`❌ Invalid version format: ${versionType}`);
          process.exit(1);
        }
        updateVersion(versionType);
        break;
        
      case 'tag':
        createGitTag(getCurrentVersion());
        break;
        
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();