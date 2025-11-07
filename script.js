// scripts/aggregate.js
// Reads open issues labeled "dish" and writes data/dishes.json
// Uses the GITHUB_TOKEN implicit in Actions to call the API when needed.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;
const token = process.env.GITHUB_TOKEN;

async function main() {
  const issues = await fetchIssues();
  const items = issues
    .filter(i => !i.pull_request) // exclude PRs just in case
    .filter(i => i.labels.some(l => l.name.toLowerCase() === 'dish'))
    .map(parseIssueToDish)
    .filter(Boolean);

  // Sort by created time asc
  items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  // Ensure data folder exists
  if (!existsSync('data')) mkdirSync('data');

  const path = 'data/dishes.json';
  writeFileSync(path, JSON.stringify(items, null, 2));
  console.log(`Wrote ${items.length} dishes to ${path}`);
}

function parseIssueToDish(issue) {
  // Title format: "Dish: <dish name> — <guest name>"
  const title = issue.title || '';
  const titleMatch = title.match(/^Dish:\s*(.+?)\s*—\s*(.+)$/);
  let dishName = '';
  let yourName = '';

  if (titleMatch) {
    dishName = titleMatch[1].trim();
    yourName = titleMatch[2].trim();
  } else {
    // fallback: try to parse from body lines
    const body = issue.body || '';
    const dishLine = body.match(/Dish Name:\s*(.+)/i);
    const guestLine = body.match(/Guest Name:\s*(.+)/i);
    dishName = dishLine ? dishLine[1].trim() : '';
    yourName = guestLine ? guestLine[1].trim() : '';
  }

  if (!dishName || !yourName) {
    return null;
  }

  const body = issue.body || '';
  const isVegan = /Vegan:\s*(Yes|True)/i.test(body);
  const isGlutenFree = /Gluten Free:\s*(Yes|True)/i.test(body);
  const isLactoseFree = /Lactose Free:\s*(Yes|True)/i.test(body);

  return {
    id: `issue_${issue.number}`,
    dishName,
    yourName,
    isVegan,
    isGlutenFree,
    isLactoseFree,
    createdAt: issue.created_at
  };
}

async function fetchIssues(page = 1, acc = []) {
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch issues: ${res.status} ${text}`);
  }
  const batch = await res.json();
  const nextAcc = acc.concat(batch);
  if (batch.length === 100) {
    return fetchIssues(page + 1, nextAcc);
  }
  return nextAcc;
}

await main();
