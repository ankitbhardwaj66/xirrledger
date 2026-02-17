# XIRR Ledger Website

Modern, responsive website for XIRR Ledger - The Only Ledger-Based XIRR Calculator.

Built with **Next.js 16**, **React 19**, **TypeScript**, and **Tailwind CSS 4**.

## Features

- 🚀 **Static Site Generation** - Fully static HTML output, perfect for shared hosting
- 📱 **Fully Responsive** - Works beautifully on all devices
- ⚡ **Blazing Fast** - Optimized performance with Next.js
- 🎨 **Modern Design** - Clean, professional corporate styling
- ♿ **Accessible** - Built with accessibility in mind
- 🔍 **SEO Optimized** - Proper meta tags and semantic HTML

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Deployment:** Static export for shared hosting

## Project Structure

```
website/
├── app/                      # Next.js app directory
│   ├── page.tsx             # Homepage
│   ├── features/            # Features page
│   ├── how-it-works/        # How it works guide
│   ├── faq/                 # FAQ page
│   ├── contact/             # Contact page
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles
├── components/              # Reusable components
│   ├── Navigation.tsx       # Header navigation
│   └── Footer.tsx           # Footer
├── public/                  # Static assets (if any)
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies

```

## Development

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
cd website
npm install
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the website.

### Build for Production

```bash
npm run build
```

This generates static HTML files in the `out/` directory, ready for deployment.

### Lint

```bash
npm run lint
```

## Deployment

The website is configured for static export and can be deployed to any static hosting provider.

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions on deploying to Hostinger.

### Quick Deploy to Hostinger

1. Build the site: `npm run build`
2. Upload contents of `out/` directory to `public_html/` via FTP or File Manager
3. Configure domain DNS to point to Hostinger
4. Enable SSL certificate in Hostinger panel

## Customization

### Update Contact Information

Replace placeholder contact info in:
- `components/Footer.tsx`
- `app/contact/page.tsx`
- `app/faq/page.tsx`

**Email:** Replace `contact@xirrledger.com`
**WhatsApp:** Replace `1234567890` with your number (format: `919876543210`)

### Update Colors

Edit theme colors in `tailwind.config.ts`:

```typescript
colors: {
  primary: {
    DEFAULT: '#1f77b4',  // Main brand color
    dark: '#155a8a',     // Hover states
    light: '#4a9dd6',    // Accents
  },
}
```

### Update Calculator URL

Replace `https://xirrcalculatorr.streamlit.app/` with your new URL when ready.

## Pages

- **/** - Homepage with hero, features, and CTAs
- **/features** - Detailed feature list with roadmap
- **/how-it-works** - Step-by-step guide for users
- **/faq** - Frequently asked questions with accordion
- **/contact** - Contact information and support

## Performance

- Static site generation for maximum speed
- Automatic code splitting
- Optimized images and assets
- Browser caching via `.htaccess`
- Tailwind CSS with minimal runtime

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Copyright © 2024 Ankit Bhardwaj. All rights reserved.

## Support

For issues or questions about the website, contact via the channels listed on the Contact page.
