require('dotenv').config();
const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const iconMap = require('./icons/icon-map');
const config = require('./config');

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_PAT || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_PAT or AIRTABLE_BASE_ID in environment variables.');
  process.exit(1);
}

// --- Airtable data fetching ---

async function fetchTable(tableName, options = {}) {
  let allRecords = [];
  let offset = null;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`
    );
    if (options.sort) {
      options.sort.forEach((s, i) => {
        url.searchParams.append(`sort[${i}][field]`, s.field);
        url.searchParams.append(`sort[${i}][direction]`, s.direction || 'asc');
      });
    }
    if (options.filterByFormula) {
      url.searchParams.append('filterByFormula', options.filterByFormula);
    }
    if (offset) {
      url.searchParams.append('offset', offset);
    }

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Airtable API error for "${tableName}": ${response.status} ${body}`);
    }

    const data = await response.json();
    allRecords = allRecords.concat(data.records.map(r => r.fields));
    offset = data.offset || null;
  } while (offset);

  return allRecords;
}

// --- Download Airtable images locally ---

async function downloadImage(url, destPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function downloadAllImages(records, fieldName, subDir, distDir) {
  const imgDir = path.join(distDir, 'images', subDir);
  fs.mkdirSync(imgDir, { recursive: true });

  const downloads = [];

  for (const record of records) {
    const attachments = record[fieldName];
    if (!attachments || !attachments.length) continue;

    const attachment = attachments[0];
    const ext = (attachment.type || 'image/jpeg').split('/')[1] || 'jpg';
    const filename = `${slugify(record.Name)}.${ext}`;
    const localPath = `images/${subDir}/${filename}`;
    const destPath = path.join(distDir, localPath);

    // Replace the Airtable URL with the local path
    attachment.localPath = localPath;

    downloads.push(
      downloadImage(attachment.url, destPath)
        .then(() => console.log(`  Downloaded: ${localPath}`))
        .catch(err => console.warn(`  Warning: Could not download image for "${record.Name}": ${err.message}`))
    );
  }

  await Promise.all(downloads);
}

// --- Compute stats from fetched data ---
// Airtable fields: Name, Website, Description, Acquired Date, Logo, Board Seat (Yes/No), Status (Active/Exited)

function computeStats(investments) {
  const active = investments.filter(c => c.Status === 'Active');
  const boardSeats = investments.filter(c => c['Board Seat'] === 'Yes');

  // Count unique states/provinces across portfolio
  const regions = new Set();
  investments.forEach(c => {
    if (c.Location) {
      const parts = c.Location.split(', ');
      if (parts.length >= 2) regions.add(parts[parts.length - (parts.length > 2 ? 2 : 1)]);
    }
  });

  return {
    home: [
      { Number: `${active.length}`, Label: 'Active Companies' },
      { Number: config.combinedRevenue, Label: 'Combined Revenue' },
      { Number: config.activeSearchFunds, Label: 'Active Search Funds' }
    ],
    portfolio: [
      { Number: `${active.length}`, Label: 'Active Companies' },
      { Number: config.combinedRevenue, Label: 'Combined Revenue' },
      { Number: config.activeSearchFunds, Label: 'Active Search Funds' },
      { Number: `${regions.size}`, Label: 'States & Provinces' },
      { Number: `${boardSeats.length}`, Label: 'Board Seats' }
    ]
  };
}

// --- Handlebars helpers ---

function registerHelpers() {
  Handlebars.registerHelper('paragraphs', function (text) {
    if (!text) return '';
    const paras = text.split(/\n\n+/);
    return new Handlebars.SafeString(
      paras.map((p, i) => `<p${i > 0 ? ' class="mt-4"' : ''}>${Handlebars.escapeExpression(p)}</p>`).join('\n          ')
    );
  });

  Handlebars.registerHelper('delayClass', function (index) {
    return `delay-${(index % 4) + 1}`;
  });

  Handlebars.registerHelper('svgIcon', function (iconName) {
    return new Handlebars.SafeString(iconMap[iconName] || '');
  });

  Handlebars.registerHelper('eq', function (a, b) {
    return a === b;
  });

  // Extract year from ISO date string like "2021-10-22"
  Handlebars.registerHelper('year', function (dateStr) {
    if (!dateStr) return '';
    return dateStr.substring(0, 4);
  });

  // Get logo URL — prefer local downloaded path, fall back to Airtable URL
  Handlebars.registerHelper('logoUrl', function (logoArray) {
    if (!logoArray || !logoArray.length) return '';
    return logoArray[0].localPath || logoArray[0].url;
  });

  // Check if logo exists
  Handlebars.registerHelper('hasLogo', function (logoArray) {
    return logoArray && logoArray.length > 0;
  });
}

// --- Register partials ---

function registerPartials() {
  const partialsDir = path.join(__dirname, 'templates', 'partials');
  const files = fs.readdirSync(partialsDir);
  for (const file of files) {
    if (file.endsWith('.hbs')) {
      const name = path.basename(file, '.hbs');
      const content = fs.readFileSync(path.join(partialsDir, file), 'utf8');
      Handlebars.registerPartial(name, content);
    }
  }
}

// --- Compile and render a template ---

function renderPage(templateName, data) {
  const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);
  const source = fs.readFileSync(templatePath, 'utf8');
  const template = Handlebars.compile(source);
  return template(data);
}

// --- Copy static assets to dist ---

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// --- Main build ---

async function build() {
  console.log('Fetching data from Airtable...');

  const [investments, people] = await Promise.all([
    fetchTable('Website - Investments', { sort: [{ field: 'Acquired Date' }] }),
    fetchTable('Website - People')
  ]);

  console.log(`  Fetched ${investments.length} investments, ${people.length} people`);

  // Split people by Role field (Principal, Advisory Board, Collaborator)
  const teamMembers = people.filter(p => p.Role === 'Principal');

  // Explicit display order for advisors/collaborators
  const advisorOrder = ['Jon Davis', 'David Croll', 'Scott Hutchins', 'Alfonso Blohm'];
  const advisors = people
    .filter(p => p.Role === 'Advisory Board' || p.Role === 'Collaborator')
    .sort((a, b) => {
      const ai = advisorOrder.indexOf(a.Name);
      const bi = advisorOrder.indexOf(b.Name);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  // Split investments by status
  const activeInvestments = investments.filter(c => c.Status === 'Active');
  const exitedInvestments = investments.filter(c => c.Status === 'Exited');

  // Board seats from investments
  const boardSeats = investments.filter(c => c['Board Seat'] === 'Yes');

  // Compute stats
  const stats = computeStats(investments);

  // Prepare dist directory
  const distDir = path.join(__dirname, '..', 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  // Download Airtable images locally so they don't expire
  console.log('Downloading images from Airtable...');
  await Promise.all([
    downloadAllImages(investments, 'Logo', 'logos', distDir),
    downloadAllImages(people, 'Image', 'people', distDir)
  ]);

  console.log('Rendering templates...');

  registerHelpers();
  registerPartials();

  // Render pages
  const pages = [
    {
      template: 'index',
      output: 'index.html',
      data: { activePage: 'index', stats: stats.home }
    },
    {
      template: 'portfolio',
      output: 'portfolio.html',
      data: {
        activePage: 'portfolio',
        stats: stats.portfolio,
        activeInvestments,
        exitedInvestments,
        allInvestments: investments
      }
    },
    {
      template: 'about',
      output: 'about.html',
      data: {
        activePage: 'about',
        teamMembers,
        advisors,
        boardSeats
      }
    },
    {
      template: 'contact',
      output: 'contact.html',
      data: {
        activePage: 'contact',
        airtableConfig: {
          pat: AIRTABLE_PAT,
          baseId: AIRTABLE_BASE_ID
        }
      }
    },
    {
      template: 'login',
      output: 'login.html',
      data: { activePage: 'login' }
    }
  ];

  for (const page of pages) {
    const html = renderPage(page.template, page.data);
    fs.writeFileSync(path.join(distDir, page.output), html, 'utf8');
    console.log(`  Wrote ${page.output}`);
  }

  // Copy static assets
  const rootDir = path.join(__dirname, '..');
  copyDir(path.join(rootDir, 'css'), path.join(distDir, 'css'));
  copyDir(path.join(rootDir, 'js'), path.join(distDir, 'js'));
  copyDir(path.join(rootDir, 'images'), path.join(distDir, 'images'));

  // Copy CNAME for custom domain
  const cnameSrc = path.join(rootDir, 'CNAME');
  if (fs.existsSync(cnameSrc)) {
    fs.copyFileSync(cnameSrc, path.join(distDir, 'CNAME'));
  }

  console.log('Build complete! Output in dist/');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
