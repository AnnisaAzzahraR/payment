# SIMRS Payment API

Backend API untuk sistem payment SIMRS dengan Express.js dan PostgreSQL.

## Deployment

### Deploy ke Render

1. Push code ke GitHub repository
2. Buat akun di [Render.com](https://render.com)
3. Connect GitHub repository
4. Pilih "Web Service"
5. Set environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `NODE_ENV`: production
6. Deploy akan otomatis

### Deploy ke Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. Deploy: `vercel --prod`
4. Set environment variables di Vercel dashboard:
   - `DATABASE_URL`: PostgreSQL connection string

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Port untuk server (default: 3001)
- `NODE_ENV`: Environment mode (production/development)

## API Endpoints

- `GET /` - Health check
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice
