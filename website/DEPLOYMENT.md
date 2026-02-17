# Deployment Guide for XIRR Ledger Website

This guide will help you deploy the XIRR Ledger website to your Hostinger shared hosting.

## What You Need

- Hostinger shared hosting account
- Domain: **xirrledger.com** (already purchased)
- FTP/File Manager access to your hosting
- Node.js installed on your local machine (for building)

## Deployment Steps

### Step 1: Build the Website Locally

The website is built with Next.js and needs to be compiled into static HTML files before uploading.

```bash
cd website
npm install
npm run build
```

This creates an `out/` directory with all static files ready for deployment.

### Step 2: Connect to Hostinger

You have two options to upload files:

#### Option A: File Manager (Easiest)
1. Log in to your Hostinger control panel (hPanel)
2. Go to **Files → File Manager**
3. Navigate to `public_html/` directory

#### Option B: FTP (Recommended for large uploads)
1. Get FTP credentials from Hostinger:
   - Go to **Files → FTP Accounts**
   - Create or use existing FTP account
2. Use an FTP client (FileZilla recommended):
   - Host: ftp.xirrledger.com (or your Hostinger FTP host)
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21

### Step 3: Upload the Website

1. **Navigate to your domain's directory:**
   - If xirrledger.com is your primary domain: `public_html/`
   - If it's an addon domain: `public_html/xirrledger.com/`

2. **Upload ALL files from the `out/` directory:**
   ```
   out/
   ├── index.html
   ├── features.html
   ├── how-it-works.html
   ├── faq.html
   ├── contact.html
   ├── _next/ (entire folder)
   ├── 404.html
   └── ... (all other files)
   ```

3. **Important:** Upload the contents of `out/`, not the `out/` folder itself
   - ✅ Correct: `public_html/index.html`
   - ❌ Wrong: `public_html/out/index.html`

### Step 4: Configure Domain

1. In Hostinger hPanel, go to **Domains**
2. Ensure **xirrledger.com** points to the correct directory
3. If needed, set up DNS:
   - The domain should point to your Hostinger server's IP
   - Usually handled automatically if domain registered with Hostinger

### Step 5: Set Up SSL Certificate (HTTPS)

1. In hPanel, go to **Security → SSL**
2. Install free SSL certificate for xirrledger.com
3. Enable "Force HTTPS" to redirect all HTTP traffic to HTTPS

### Step 6: Configure .htaccess (Optional but Recommended)

Create a `.htaccess` file in your website root with the following content:

```apache
# Enable rewrite engine
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Remove .html extension
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME}\.html -f
RewriteRule ^(.*)$ $1.html [L]

# Error page
ErrorDocument 404 /404.html

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Browser caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

Upload this `.htaccess` file to your website root directory.

### Step 7: Test Your Website

1. Visit **https://xirrledger.com** in your browser
2. Test all pages:
   - Home page
   - Features
   - How It Works
   - FAQ
   - Contact
3. Check that all links work
4. Test on mobile devices
5. Verify SSL certificate is working (padlock icon in browser)

## Updating the Website

When you make changes to the website:

1. Make your code changes locally
2. Rebuild the website:
   ```bash
   cd website
   npm run build
   ```
3. Upload the new `out/` directory contents to Hostinger (overwrite existing files)
4. Clear browser cache and test

## Troubleshooting

### Pages show 404 errors
- Make sure `.htaccess` file is uploaded and configured
- Check that all HTML files are in the root directory

### Website not loading
- Check DNS settings in Hostinger
- Verify domain is pointed to correct directory
- Check file permissions (should be 644 for files, 755 for folders)

### Styles not loading
- Verify `_next/` folder was uploaded completely
- Check browser console for errors
- Clear browser cache

### SSL not working
- Wait 10-15 minutes after enabling SSL (propagation time)
- Force HTTPS in SSL settings
- Add HTTPS redirect to `.htaccess`

## Performance Tips

1. **Enable caching** in Hostinger (usually in hPanel → Advanced → Cache Manager)
2. **Cloudflare** (optional): Add your domain to Cloudflare for CDN and DDoS protection
3. **Image optimization**: All images in the site should be optimized
4. **Compression**: The `.htaccess` file enables GZIP compression

## Contact Information Update

Don't forget to update the contact information in the website:

### Email
Replace `contact@xirrledger.com` in:
- `components/Footer.tsx`
- `app/contact/page.tsx`
- `app/faq/page.tsx`

### WhatsApp
Replace the WhatsApp number `1234567890` in:
- `components/Footer.tsx`
- `app/contact/page.tsx`
- `app/faq/page.tsx`
- `app/page.tsx` (homepage)

Update the number format: `https://wa.me/919876543210` (include country code without +)

Then rebuild and redeploy.

## Support

If you encounter issues:
- Check Hostinger's knowledge base
- Contact Hostinger support
- Review error logs in hPanel → Statistics → Error Logs

## Next Steps (Phase 2)

When you're ready to move the actual calculator to your domain:
1. You'll need Node.js hosting or serverless deployment
2. Consider upgrading to Hostinger's Cloud hosting or VPS
3. Or deploy to Vercel/Netlify and point xirrledger.com there

For now, the Streamlit app link will redirect users to the hosted calculator.
