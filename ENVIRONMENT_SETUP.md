# Environment Variables Setup

This document explains how to properly configure environment variables for the ATS Deal Recap application.

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# OpenAI Configuration (Required)
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_OPENAI_BASE_URL=https://api.openai.com/v1
VITE_OPENAI_MODEL=gpt-3.5-turbo

# Application Configuration (Optional)
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_NAME=ATS Deal Recap
VITE_APP_VERSION=1.0.0

# Development Settings (Optional)
VITE_DEBUG_MODE=false
VITE_LOG_LEVEL=info

# Database Configuration (Required for database operations)
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=ats_deal_recap
VITE_DB_USER=postgres
VITE_DB_PASSWORD=your_db_password_here
VITE_DB_SSL=false
VITE_DB_MAX_CONNECTIONS=10
```

## Important Notes

### Vite Prefix Requirement
- **CRITICAL**: All environment variables must be prefixed with `VITE_` to be accessible in the browser
- Variables without the `VITE_` prefix will not be available in your React components

### Security
- **Never commit `.env` files** to version control
- Add `.env` to your `.gitignore` file
- Use different API keys for development and production

## Getting Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

## Database Setup

### PostgreSQL Installation

1. **Install PostgreSQL** on your system:
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - **macOS**: Use Homebrew: `brew install postgresql`
   - **Linux**: Use your package manager: `sudo apt-get install postgresql postgresql-contrib`

2. **Start PostgreSQL service**:
   - **Windows**: Start the PostgreSQL service from Services
   - **macOS**: `brew services start postgresql`
   - **Linux**: `sudo systemctl start postgresql`

3. **Create database and user**:
   ```sql
   -- Connect to PostgreSQL as superuser
   psql -U postgres
   
   -- Create database
   CREATE DATABASE ats_deal_recap;
   
   -- Create user (optional, you can use postgres user)
   CREATE USER ats_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE ats_deal_recap TO ats_user;
   ```

4. **Run the schema**:
   ```bash
   # Connect to your database and run the schema
   psql -U postgres -d ats_deal_recap -f database/schema.sql
   ```

### Database Configuration

Update your `.env` file with your database credentials:

```env
VITE_DB_HOST=localhost
VITE_DB_PORT=5432
VITE_DB_NAME=ats_deal_recap
VITE_DB_USER=postgres  # or your custom user
VITE_DB_PASSWORD=your_password
VITE_DB_SSL=false
VITE_DB_MAX_CONNECTIONS=10
```

## Usage in Code

### Import Configuration
```typescript
import { config } from './config/env';

// Access OpenAI configuration
const apiKey = config.openai.apiKey;
const baseUrl = config.openai.baseUrl;
const model = config.openai.model;
```

### Using OpenAI Service
```typescript
import { openAIService, createOpenAIService } from './services';

// Use default service (uses environment variables)
if (openAIService) {
    const response = await openAIService.generateDealSummary(dealData);
}

// Or create with custom API key
const customService = createOpenAIService('your-custom-key');
```

## Environment Validation

The application automatically validates required environment variables on startup:

- Missing variables will show console warnings
- In development mode, the app will continue to run with limited functionality
- In production, missing required variables will cause the app to fail

## Production Deployment

### Vercel
1. Go to your project settings
2. Navigate to Environment Variables
3. Add your variables with the `VITE_` prefix

### Netlify
1. Go to Site Settings
2. Navigate to Environment Variables
3. Add your variables with the `VITE_` prefix

### Heroku
```bash
heroku config:set VITE_OPENAI_API_KEY=your_key_here
```

## Troubleshooting

### Common Issues

1. **"OpenAI API key is required" error**
   - Make sure your `.env` file exists in the project root
   - Verify the variable name is `VITE_OPENAI_API_KEY`
   - Restart your development server after adding the `.env` file

2. **Environment variables not loading**
   - Check that variables start with `VITE_`
   - Ensure `.env` file is in the correct location (project root)
   - Restart the development server

3. **API calls failing**
   - Verify your OpenAI API key is valid
   - Check your OpenAI account has sufficient credits
   - Ensure you're using the correct model name

### Debug Mode

Enable debug mode to see more detailed logging:

```env
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

This will provide additional console output to help diagnose issues.
