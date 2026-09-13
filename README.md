# Heybaragise Premium Store 🌻🐰

Static website + Supabase database + hidden Admin Mode.

## Features
- Product cards
- Product detail page
- Multiple packages and prices
- Promotions
- Upload product images / series posters
- External links
- Combo promotions combining multiple products
- Add / edit / delete products
- Add / edit / delete promotions
- Add / edit / delete combos
- Hidden Admin entry: click the logo 5 times
- Real Supabase Authentication + Row Level Security

## Setup

### 1. Create Supabase project
Create a project at Supabase.

### 2. Run database SQL
Open **SQL Editor** and run the entire `supabase.sql`.

### 3. Create your Admin user
In Supabase Authentication, create an email/password user.

Copy that user's UUID and run:

```sql
insert into public.admin_users (user_id)
values ('YOUR_AUTH_USER_UUID');
```

### 4. Put API values into app.js

```js
const SUPABASE_URL = "YOUR_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

Use only the public anon key in the frontend. Never put the service_role key in GitHub.

### 5. Upload to GitHub

Repository structure:

```text
heybaragise-premium-store/
├── index.html
├── style.css
├── app.js
├── supabase.sql
└── README.md
```

### 6. Deploy
You can deploy the repository using GitHub Pages, Netlify, or Vercel.

## Admin Mode
On the live website, click the **Heybaragise logo 5 times quickly**.

This opens the login screen.

The hidden trigger is only for UI cleanliness; security comes from Supabase Authentication + Row Level Security.

## About Combo
Combo is interpreted as a combined promotion where multiple products are selected and sold together at a special discounted price.
