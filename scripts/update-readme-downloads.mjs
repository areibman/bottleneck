#!/usr/bin/env node
import https from 'node:https';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const owner = 'areibman';
const repo = 'bottleneck';
const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

const headers = {
  'User-Agent': 'bottleneck-update-readme-downloads-script',
  Accept: 'application/vnd.github+json',
};

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (token) {
  headers.Authorization = `Bearer ${token}`;
}

const release = await fetchJson(apiUrl, headers);

if (!release.assets || release.assets.length === 0) {
  throw new Error('Latest release does not contain any assets.');
}

function findAsset(predicate, description) {
  const asset = release.assets.find(predicate);
  if (!asset) {
    const availableNames = release.assets.map((asset) => asset.name).join(', ');
    throw new Error(`Could not find ${description} asset. Available assets: ${availableNames}`);
  }
  return asset;
}

const appleSiliconAsset = findAsset(
  (asset) => asset.name?.toLowerCase().endsWith('arm64.dmg'),
  'macOS Apple Silicon DMG',
);

const intelAsset = findAsset(
  (asset) => asset.name?.toLowerCase().endsWith('.dmg') && !asset.name?.toLowerCase().includes('arm64'),
  'macOS Intel DMG',
);

const windowsAsset = findAsset(
  (asset) => asset.name?.toLowerCase().endsWith('.exe'),
  'Windows installer',
);

const downloadLine = `${[
  `[macOS · Apple Silicon (DMG)](${appleSiliconAsset.browser_download_url})`,
  `[macOS · Intel (DMG)](${intelAsset.browser_download_url})`,
  `[Windows · Installer (EXE)](${windowsAsset.browser_download_url})`,
].join(' · ')}`;

const startMarker = '<!-- DOWNLOAD_LINKS_START -->';
const autoMarker = '<!-- Automatically updated by scripts/update-readme-downloads.mjs -->';
const endMarker = '<!-- DOWNLOAD_LINKS_END -->';

const readmePath = new URL('../README.md', import.meta.url);
const readmeContent = await readFile(readmePath, 'utf8');

const markerRegex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
if (!markerRegex.test(readmeContent)) {
  throw new Error('Download links markers not found in README.md');
}

const replacementBlock = `${startMarker}${autoMarker}\n${downloadLine}\n${endMarker}`;
const updatedReadme = readmeContent.replace(markerRegex, replacementBlock);

if (updatedReadme !== readmeContent) {
  await writeFile(readmePath, updatedReadme);
  console.log('README.md download links updated.');
} else {
  console.log('README.md download links are already up to date.');
}

async function fetchJson(url, headers) {
  try {
    return await requestJson(url, headers);
  } catch (error) {
    if (error && (error.code === 'ENETUNREACH' || error.code === 'EAI_AGAIN')) {
      return fetchJsonWithCurl(url, headers);
    }
    throw error;
  }
}

function requestJson(url, headers, redirectCount = 0) {
  if (redirectCount > 5) {
    throw new Error('Too many redirects while fetching release information.');
  }

  return new Promise((resolve, reject) => {
    const request = https.request(url, { headers }, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const location = response.headers.location.startsWith('http')
          ? response.headers.location
          : new URL(response.headers.location, url).toString();
        response.resume();
        resolve(requestJson(location, headers, redirectCount + 1));
        return;
      }

      let rawData = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        rawData += chunk;
      });

      response.on('end', () => {
        if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Failed to load latest release: ${response.statusCode} ${response.statusMessage}`));
          return;
        }

        try {
          const parsed = JSON.parse(rawData);
          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
    request.end();
  });
}

async function fetchJsonWithCurl(url, headers) {
  const curlArgs = ['-fsSL'];
  Object.entries(headers).forEach(([key, value]) => {
    curlArgs.push('-H', `${key}: ${value}`);
  });
  curlArgs.push(url);

  const { stdout } = await execFileAsync('curl', curlArgs);
  return JSON.parse(stdout);
}
