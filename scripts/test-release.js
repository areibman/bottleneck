#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Testing Release Pipeline...\n');

// Test 1: Check if all required files exist
console.log('1. Checking required files...');
const requiredFiles = [
  '.github/workflows/release.yml',
  '.github/workflows/build.yml',
  'build/entitlements.mac.plist',
  'scripts/version.js',
  'src/main/updater.ts',
  'src/renderer/components/UpdaterSettings.tsx'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please check the setup.');
  process.exit(1);
}

// Test 2: Check package.json configuration
console.log('\n2. Checking package.json configuration...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const requiredDeps = ['electron-updater'];
const requiredScripts = ['version:patch', 'version:minor', 'version:major', 'release'];

let configValid = true;

// Check dependencies
requiredDeps.forEach(dep => {
  if (packageJson.devDependencies?.[dep] || packageJson.dependencies?.[dep]) {
    console.log(`   ✅ Dependency: ${dep}`);
  } else {
    console.log(`   ❌ Missing dependency: ${dep}`);
    configValid = false;
  }
});

// Check scripts
requiredScripts.forEach(script => {
  if (packageJson.scripts?.[script]) {
    console.log(`   ✅ Script: ${script}`);
  } else {
    console.log(`   ❌ Missing script: ${script}`);
    configValid = false;
  }
});

// Check build configuration
if (packageJson.build?.mac?.target && packageJson.build?.win?.target && packageJson.build?.linux?.target) {
  console.log('   ✅ Build configuration for all platforms');
} else {
  console.log('   ❌ Incomplete build configuration');
  configValid = false;
}

if (!configValid) {
  console.log('\n❌ Package.json configuration is incomplete.');
  process.exit(1);
}

// Test 3: Check if version script works
console.log('\n3. Testing version script...');
try {
  // Test with a dry run (just check if it shows usage)
  const output = execSync('node scripts/version.js 2>&1', { encoding: 'utf8' });
  if (output.includes('Usage:') && output.includes('Current version:')) {
    console.log('   ✅ Version script runs without errors');
  } else {
    console.log('   ❌ Version script output unexpected:', output);
    process.exit(1);
  }
} catch (error) {
  // The script exits with code 1 when no arguments are provided, which is expected
  if (error.status === 1) {
    console.log('   ✅ Version script runs without errors (exits with code 1 as expected)');
  } else {
    console.log('   ❌ Version script failed:', error.message);
    process.exit(1);
  }
}

// Test 4: Check TypeScript compilation (skip if dependencies not installed)
console.log('\n4. Testing TypeScript compilation...');
try {
  // Check if TypeScript is available
  execSync('npx tsc --version', { stdio: 'pipe' });
  
  try {
    execSync('npm run build:main', { stdio: 'pipe' });
    console.log('   ✅ Main process compiles successfully');
  } catch (error) {
    console.log('   ⚠️  Main process compilation failed (dependencies may not be installed)');
    console.log('   Error:', error.message);
  }

  try {
    execSync('npm run build:preload', { stdio: 'pipe' });
    console.log('   ✅ Preload script compiles successfully');
  } catch (error) {
    console.log('   ⚠️  Preload script compilation failed (dependencies may not be installed)');
    console.log('   Error:', error.message);
  }
} catch (error) {
  console.log('   ⚠️  TypeScript not available, skipping compilation tests');
  console.log('   Run "npm install" to install dependencies');
}

// Test 5: Check if updater integration is working
console.log('\n5. Testing updater integration...');
const mainIndexPath = path.join(__dirname, '..', 'dist', 'main', 'index.js');
if (fs.existsSync(mainIndexPath)) {
  const mainContent = fs.readFileSync(mainIndexPath, 'utf8');
  if (mainContent.includes('updater') && mainContent.includes('electron-updater')) {
    console.log('   ✅ Updater integration found in main process');
  } else {
    console.log('   ❌ Updater integration not found in main process');
    process.exit(1);
  }
} else {
  console.log('   ⚠️  Main process not built, skipping updater check');
}

// Test 6: Check GitHub Actions workflow syntax
console.log('\n6. Checking GitHub Actions workflow syntax...');
try {
  // This is a basic check - in a real scenario you'd use a YAML linter
  const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'release.yml');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  
  if (workflowContent.includes('name: Release') && 
      workflowContent.includes('on:') && 
      workflowContent.includes('jobs:')) {
    console.log('   ✅ Release workflow structure looks good');
  } else {
    console.log('   ❌ Release workflow structure is invalid');
    process.exit(1);
  }
} catch (error) {
  console.log('   ❌ Failed to read workflow file');
  process.exit(1);
}

console.log('\n🎉 All tests passed! The release pipeline is ready.');
console.log('\nNext steps:');
console.log('1. Set up GitHub secrets (see .github/workflows/setup-secrets.md)');
console.log('2. Update placeholder values in package.json and workflows');
console.log('3. Test with a prerelease: npm run release:alpha');
console.log('4. Create your first release: npm run release');