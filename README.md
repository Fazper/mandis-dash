# Mandis Dash

A personal dashboard for tracking prop trading firm accounts, expenses, and progress.

## Features

- **Configurable Account Types** - Add/edit/delete account types (firms) with custom settings per type
- **Account Tracking** - Track accounts across multiple prop firms (Apex, Lucid, etc.)
- **Expense Monitoring** - Auto-track eval and activation costs, calculate ROI
- **Progress Tracking** - Visual progress bars with editable balances and profit targets
- **Payout Projections** - Monthly calendar with simulated account growth and payout forecasts
- **Consistency Rule Support** - Accounts with 50% consistency rule take 2x longer in projections
- **User Authentication** - Secure login with Supabase Auth

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Supabase (Auth + PostgreSQL)
- **Hosting**: GitHub Pages
- **Styling**: Pure CSS with CSS Variables

## Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/fazper/mandis-dash.git
   cd mandis-dash
   ```

2. Copy `.env.example` to `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the SQL migrations in your Supabase SQL editor:
   - `supabase/migrations/001_add_firms_table.sql`

4. Install dependencies and run:
   ```bash
   npm install
   npm run dev
   ```

## Database Schema

| Table | Description |
|-------|-------------|
| `firms` | Configurable account types with eval cost, activation cost, max funded, etc. |
| `accounts` | Individual trading accounts linked to firms |
| `expenses` | Expense tracking (auto-created when adding accounts) |
| `daily_logs` | Daily activity logs |
| `user_settings` | User preferences (payout estimate, start date) |

See `supabase/migrations/` for complete schema with RLS policies.

## Account Type Settings

Each account type (firm) can be configured with:

| Setting | Description |
|---------|-------------|
| Name | Display name (e.g., "Lucid 50K") |
| Account Name | Format for individual accounts (e.g., "Lucid Flex 50K") |
| Eval Cost | Cost to purchase an evaluation |
| Activation Cost | Cost to activate a passed account (0 if none) |
| Max Funded | Maximum number of funded accounts allowed |
| Profit Target | Default profit target for new accounts |
| Color | UI accent color |
| Consistency Rule | If enabled, accounts take 2x longer in projections (50% checkpoint) |

## Deployment

Automatically deploys to GitHub Pages on push to `main` branch via GitHub Actions.

**Live**: https://fazper.github.io/mandis-dash/

## License

MIT
