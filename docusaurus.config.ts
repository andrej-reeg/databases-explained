import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Databases, Explained',
  tagline: 'A practical, current tutorial on data and databases',
  favicon: 'img/favicon.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: false, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Enable Mermaid diagrams in Markdown
  markdown: {
    mermaid: true,
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      // Offline full-text search (no external service).
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  // Production URL of the site.
  url: 'https://databases.kazmirsky.com',
  // The /<baseUrl>/ pathname the site is served under.
  // Served at the domain root (custom domain), so baseUrl is '/'.
  baseUrl: '/',

  // Deployment config - GitHub org/user and repo.
  organizationName: 'andrej-reeg',
  projectName: 'db-learn',

  onBrokenLinks: 'throw',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logo.svg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    // Mermaid follows the site color mode: readable in light and dark.
    // A subtle teal accent on edges/borders ties diagrams to the brand without
    // overriding node fills (which keeps text contrast correct in both modes).
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
      options: {
        themeVariables: {
          lineColor: '#11917a',
          primaryBorderColor: '#11917a',
        },
      },
    },
    navbar: {
      title: 'Databases, Explained',
      logo: {
        alt: 'Databases, Explained Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Lessons',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Get started',
          items: [
            {label: 'Introduction', to: '/docs/intro'},
            {label: 'Speaking SQL', to: '/docs/speaking-sql/'},
            {label: 'Designing a Database', to: '/docs/designing/'},
          ],
        },
        {
          title: 'Go deeper',
          items: [
            {label: 'Correct & Fast', to: '/docs/correct-and-fast/'},
            {label: 'Databases in Real Apps', to: '/docs/real-apps/'},
          ],
        },
        {
          title: 'Advanced',
          items: [
            {label: 'Beyond Relational', to: '/docs/beyond-relational/'},
            {label: 'Scaling & Advanced', to: '/docs/scaling/'},
            {label: 'Capstone', to: '/docs/capstone'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Databases, Explained.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['sql'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
