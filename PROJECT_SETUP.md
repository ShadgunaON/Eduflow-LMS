# EduFlow LMS - Project Setup & Migration Guide

This document outlines everything you need to bootstrap this project on a new local machine or server.

## Prerequisites
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Git**: For version control

## Environment Variables
Before running the application, you must create a `.env` file in the root directory. **Never commit this file to GitHub.** 

The `.env` file must contain the following keys:

```env
# Database
DATABASE_URL="postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?schema=public"

# NextAuth / Security
AUTH_SECRET="<YOUR_NEXTAUTH_SECRET>" # Generate with: openssl rand -base64 32
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email Notifications (Resend)
RESEND_API_KEY="<YOUR_RESEND_API_KEY>"

```

## Third-Party Services Setup

### 1. PostgreSQL (Database)
This project uses a PostgreSQL database. You can host this locally via Docker, natively, or through a managed provider like Supabase or Neon.
Ensure you update the `DATABASE_URL` with your connection string.


### 3. Resend (Email Provider)
Resend is used for sending registration verification and notification emails.
Create an account at [Resend.com](https://resend.com), generate an API Key, and paste it into the `.env` file.

## Local Bootstrap Steps

Once your `.env` is configured and Node.js is installed, follow these steps in your terminal:

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Prisma Client**
   Synchronize your Prisma schema with the local generated client:
   ```bash
   npx prisma generate
   ```

3. **Push Schema to Database**
   This will create the necessary tables in your connected PostgreSQL database:
   ```bash
   npx prisma db push
   ```
   *(Note: For production, use `npx prisma migrate deploy` instead).*

4. **Seed the Database (Optional but recommended)**
   Populate the database with initial admin, tutor, and student accounts:
   ```bash
   npx prisma db seed
   ```

5. **Run the Development Server**
   Start the Next.js local server:
   ```bash
   npm run dev
   ```

The LMS should now be available at `http://localhost:3000`.

## Testing the Build
Before deploying to production, always verify the production build completes successfully:
```bash
npm run build
```
