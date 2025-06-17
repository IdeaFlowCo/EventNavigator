# Event Navigator Project

## Running Locally
To run this project locally, use:
```bash
vercel dev
```

This will start both the frontend (Vite) and the serverless API functions.

Do NOT use `npm run dev` as it only starts the frontend and won't handle the API routes needed for Airtable URLs.

## Project Structure
- Frontend is in `/frontend` directory
- API functions are in `/api` directory
- The project uses Vercel serverless functions for backend functionality

## Environment Variables
Ensure you have a `.env` file in the frontend directory with:
- `VITE_OPENAI_API_KEY` - Your OpenAI API key for local development