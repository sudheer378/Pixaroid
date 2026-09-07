const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BASE = 'https://pixaroid.vercel.app';

const pages = {
  'currency-converter.html': {
    title: 'Currency Converter - Free Exchange Rate Calculator | Pixaroid',
    description: 'Convert amounts between major world currencies with a simple browser-based currency converter. Free to use with no registration required.',
    h2: 'Free Currency Converter',
    intro: 'Use this currency converter to calculate amounts between the currencies supported by Pixaroid. Enter an amount, choose the source and target currencies, and the result updates instantly in your browser.',
    details: [
      'Choose from the currencies available in the converter, including USD, EUR, GBP, INR, JPY, AUD, CAD, CHF, CNY and more.',
      'Swap the source and target currencies with one click to check the reverse conversion.',
      'Useful for travel planning, international price comparisons, budgeting, and quick currency calculations.',
      'The current tool uses built-in conversion data. Treat the displayed result as a calculation aid rather than a live financial quote.'
    ],
    category: 'FinanceApplication'
  },
  'timezone-planner.html': {
    title: 'World Timezone Planner - Compare Times for Meetings | Pixaroid',
    description: 'Compare dates and times across cities with a free browser-based timezone planner for international meetings, remote teams, and travel planning.',
    h2: 'Plan Across Time Zones',
    intro: 'Set a date, time, and base city, then compare the corresponding local time in multiple cities. Pixaroid\'s timezone planner is designed for international meetings, distributed teams, and travel scheduling.',
    details: [
      'Start with a base date and time and select the city that defines the starting timezone.',
      'Add cities such as New York, London, Tokyo, Sydney, Mumbai, Dubai, Singapore, Toronto and others.',
      'Each city card shows the local time, date, and UTC offset calculated by the browser.',
      'Adjust the inputs whenever your meeting time changes to compare the updated schedule.'
    ],
    category: 'ProductivityApplication'
  },
  'text-translator.html': {
    title: 'Text Translator - Free Online Language Tool | Pixaroid',
    description: 'Translate and compare text between the languages available in this free browser-based translator. Includes language detection, copy, clear, and swap controls.',
    h2: 'Free Text Translator',
    intro: 'Use this translator to enter text, choose a source and target language, and review the generated output. The page includes language selection, automatic source-language detection, character counts, copy, clear, and swap controls.',
    details: [
      'Select a source language or use the built-in detection option.',
      'Choose a target language from the languages provided by the tool.',
      'Copy the output or swap the selected languages when checking another direction.',
      'The current implementation is a demo interface and does not connect to a live translation service, so its output should not be treated as a production translation.'
    ],
    category: 'UtilityApplication'
  },
  'phone-code-finder.html': {
    title: 'Phone Code Finder - International Calling Codes | Pixaroid',
    description: 'Find international country calling codes with a fast searchable directory. Search by country name or dialing code in this free browser-based tool.',
    h2: 'International Phone Code Finder',
    intro: 'Find a country calling code by searching the country name or dialing prefix. The tool displays the country, flag, and international calling code in a searchable list.',
    details: [
      'Search by country name to find the matching international dialing code.',
      'Search directly by a numeric calling prefix when you already know part of the code.',
      'The directory is useful when preparing contact details, planning travel, or checking an international number format.',
      'The displayed list is built into the page, so results appear immediately without a server-side lookup.'
    ],
    category: 'UtilityApplication'
  },
  'unit-converter.html': {
    title: 'Unit Converter - Length, Weight, Temperature & More | Pixaroid',
    description: 'Convert length, weight, temperature, volume, and area values with a free browser-based unit converter for metric and imperial measurements.',
    h2: 'Free Online Unit Converter',
    intro: 'Convert common measurements directly in your browser. Choose a category, enter a value, select the source and target units, and Pixaroid calculates the converted result instantly.',
    details: [
      'Length conversions include meters, kilometers, centimeters, millimeters, miles, yards, feet, and inches.',
      'Weight, volume, and area categories provide commonly used metric and imperial units.',
      'Temperature conversions support Celsius, Fahrenheit, and Kelvin with dedicated formulas.',
      'The conversion happens in the page, making the tool useful for study, travel, projects, and everyday calculations.'
    ],
    category: 'UtilityApplication'
  },
  'holiday-calendar.html': {
    title: 'Holiday Calendar - Public Holidays by Country | Pixaroid',
    description: 'Check public holiday dates for the countries included in Pixaroid\'s free holiday calendar tool. Useful for travel, planning, and international teams.',
    h2: 'International Holiday Calendar',
    intro: 'Use the holiday calendar to review public holiday dates for the countries supported by the tool. It is designed to help with travel plans, work schedules, and international coordination.',
    details: [
      'Select a supported country to view its holiday information.',
      'Use holiday dates as a planning reference when coordinating trips, meetings, or project schedules.',
      'The country coverage is based on the holiday data included in the page.',
      'For legal, payroll, or official scheduling decisions, verify important dates with an authoritative local source.'
    ],
    category: 'UtilityApplication'
  },
  'passport-photo-resizer.html': {
    title: 'Passport Photo Resizer - Resize Photos for Documents | Pixaroid',
    description: 'Resize a photo to passport and document dimensions supported by the tool. Free browser-based photo resizing for common travel and application formats.',
    h2: 'Passport Photo Resizer',
    intro: 'Prepare a photo for passport, visa, and document applications by choosing a supported country or document format and resizing the image to the required dimensions available in the tool.',
    details: [
      'Choose from the country and document presets built into the resizer.',
      'Resize an image in the browser without uploading it to a Pixaroid server.',
      'Use the result as a starting point for an application, then check the official authority\'s latest photo requirements before submission.',
      'Different countries and application types can require different sizes, backgrounds, and framing rules.'
    ],
    category: 'PhotographyApplication'
  },
  'vat-calculator.html': {
    title: 'VAT Calculator - Calculate Tax and Total Amounts | Pixaroid',
    description: 'Calculate VAT amounts and totals for supported countries with this free browser-based VAT calculator. Enter a price and rate to compare tax-inclusive values.',
    h2: 'VAT Calculator',
    intro: 'Use the VAT calculator to estimate tax amounts from a price and a VAT rate supported by the page. It is designed for quick calculations when reviewing prices or planning international transactions.',
    details: [
      'Enter an amount and choose the VAT rate available in the calculator.',
      'Use the calculated VAT and total as a quick estimate for budgeting or comparison.',
      'The calculation runs in your browser and does not require registration.',
      'VAT rules and rates can change, so confirm the applicable rate with an official tax authority for real transactions.'
    ],
    category: 'FinanceApplication'
  },
  'paper-size-converter.html': {
    title: 'Paper Size Converter - A4, Letter and International Sizes | Pixaroid',
    description: 'Compare and convert common paper sizes such as A4, Letter, Legal, A3, A5 and other formats with a free browser-based tool.',
    h2: 'Paper Size Converter',
    intro: 'Compare common paper formats used for printing, documents, forms, and office work. Select a supported paper size to view its dimensions and compare it with another format.',
    details: [
      'Useful for comparing ISO paper sizes with common North American formats.',
      'Check dimensions before preparing documents, artwork, print layouts, or office forms.',
      'The available sizes are defined by the data included in the tool.',
      'For professional printing, confirm the final page size and bleed requirements with your printer.'
    ],
    category: 'UtilityApplication'
  },
  'script-detector.html': {
    title: 'Script Detector - Identify Writing Systems in Text | Pixaroid',
    description: 'Detect common writing scripts from pasted text with a free browser-based script detector. Useful for language and text analysis.',
    h2: 'Writing Script Detector',
    intro: 'Paste text into the script detector to identify the writing systems represented by the characters. The tool can help with quick language-related text analysis without sending the input to a server.',
    details: [
      'Enter or paste text into the detector to analyze its characters.',
      'Use the result as a quick indication of the script or scripts present in the sample.',
      'The tool is useful for multilingual content review, data cleanup, and educational experiments.',
      'Script detection is different from full language identification, so a detected writing system does not necessarily identify one specific language.'
    ],
    category: 'UtilityApplication'
  },
  'address-formatter.html': {
    title: 'Address Formatter - Format International Addresses | Pixaroid',
    description: 'Format postal addresses for international use with a free browser-based address formatter. Enter address details and create a cleaner layout.',
    h2: 'International Address Formatter',
    intro: 'Create a clearer address layout for international correspondence by entering the available address fields and selecting the country format supported by the tool.',
    details: [
      'Organize names, street details, locality, postal code, region, and country information into a consistent format.',
      'Use the formatter when preparing labels, forms, mail, or contact records for international addresses.',
      'The output format depends on the country and rules implemented in the page.',
      'Postal authorities and carriers can have specific requirements, so verify critical mailing addresses before sending.'
    ],
    category: 'UtilityApplication'
  },
  'packing-list-generator.html': {
    title: 'Packing List Generator - Create a Travel Packing Checklist | Pixaroid',
    description: 'Create a practical travel packing checklist with a free browser-based packing list generator. Organize essentials by trip and category.',
    h2: 'Travel Packing List Generator',
    intro: 'Build a travel packing checklist by choosing the trip details and items you need. The generator helps turn common travel needs into a simple list that you can review before leaving.',
    details: [
      'Create a checklist for clothing, documents, toiletries, electronics, and other common travel items.',
      'Use the generated list as a starting point and add trip-specific items such as medicines, work equipment, or activity gear.',
      'Review the list before departure and adjust it for destination, weather, trip length, and airline rules.',
      'The checklist is a planning aid and does not replace destination-specific entry or baggage requirements.'
    ],
    category: 'UtilityApplication'
  }
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripGeneratedSection(html) {
  return html.replace(/\n?\s*<section data-seo-international="true"[\s\S]*?<\/section>\s*/i, '\n');
}

function replaceMeta(html, name, content) {
  const re = new RegExp(`<meta\\s+name=["']${name}["'][^>]*>`, 'i');
  const tag = `<meta name="${name}" content="${esc(content)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, `    ${tag}\n</head>`);
}

function replaceProperty(html, property, content) {
  const re = new RegExp(`<meta\\s+property=["']${property}["'][^>]*>`, 'i');
  const tag = `<meta property="${property}" content="${esc(content)}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, `    ${tag}\n</head>`);
}

function replaceCanonical(html, url) {
  const re = /<link\s+rel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${url}">`;
  return re.test(html) ? html.replace(re, tag) : html.replace(/<\/head>/i, `    ${tag}\n</head>`);
}

function replaceRobots(html) {
  return replaceMeta(html, 'robots', 'index, follow');
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
}

function buildSection(page) {
  const items = page.details.map(x => `<li>${esc(x)}</li>`).join('\n');
  const faqs = [
    [`What is the ${page.h2.toLowerCase()} used for?`, page.intro],
    ['Does the tool require registration?', 'No registration is required to use the Pixaroid tool page.'],
    ['Is this page suitable for official or regulated decisions?', 'Use the tool as a practical calculation or planning aid and verify requirements with the relevant official source when accuracy or compliance matters.']
  ].map(([q,a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n');

  return `\n<section data-seo-international="true" class="content-section" style="max-width:900px;margin:40px auto;">\n  <h2>${esc(page.h2)}</h2>\n  <p>${esc(page.intro)}</p>\n  <h3>What you can do</h3>\n  <ul>\n${items}\n  </ul>\n  <h3>Common questions</h3>\n  ${faqs}\n</section>\n`;
}

const dir = path.join(ROOT, 'tools', 'international');
for (const [file, page] of Object.entries(pages)) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  const url = `${BASE}/tools/international/${file.replace(/\.html$/, '')}/`;
  let html = fs.readFileSync(filePath, 'utf8');

  html = replaceTitle(html, page.title);
  html = replaceMeta(html, 'description', page.description);
  html = replaceRobots(html);
  html = replaceCanonical(html, url);
  html = replaceProperty(html, 'og:title', page.title);
  html = replaceProperty(html, 'og:description', page.description);
  html = replaceProperty(html, 'og:url', url);
  html = replaceMeta(html, 'twitter:title', page.title);
  html = replaceMeta(html, 'twitter:description', page.description);
  html = html.replace(/\n?\s*<meta\s+name=["']keywords["'][^>]*>/ig, '');

  html = stripGeneratedSection(html);
  const section = buildSection(page);
  html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${section}\n</body>`) : `${html}${section}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: page.title.split(' - ')[0],
    description: page.description,
    url,
    applicationCategory: page.category,
    operatingSystem: 'Any',
    provider: {
      '@type': 'Organization',
      name: 'Pixaroid',
      url: BASE,
      logo: `${BASE}/assets/svg/logo.svg`
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    }
  };

  html = html.replace(/\n?\s*<script type=["']application\/ld\+json["']>[\s\S]*?<\/script>\s*/ig, '\n');
  html = html.replace(/<\/head>/i, `\n<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>\n</head>`);

  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Optimized international SEO: ${file}`);
}
