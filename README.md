# Bonus Calculator

A comprehensive web application for calculating employee bonuses with batch processing, real-time calculations, and scenario modeling capabilities.

## Project Structure

```
├── frontend/          # React + TypeScript frontend
├── backend/           # FastAPI Python backend
├── shared/            # Shared types and utilities
└── scripts/           # Development and deployment scripts
```

## Features

- **Batch Processing Module**: Upload and process employee data files
- **Real-time Calculation Module**: Instant bonus calculations
- **Scenario Modeling Module**: Create and compare different calculation scenarios
- **Reporting and Analytics Module**: Comprehensive reports and data visualization

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Query for data fetching
- React Hook Form for form handling
- Recharts for data visualization
- Vitest for testing

### Backend
- FastAPI with Python 3.11
- SQLAlchemy ORM with Alembic migrations
- Pydantic for data validation
- PostgreSQL database (SQLite for development)

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL (optional, SQLite used by default)

### Environment Setup
1. Copy `env.example` to `.env` and configure your environment variables:
   ```bash
   cp env.example .env
   ```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Database Setup
```bash
# From the backend directory
python fix_database.py      # Fix any database issues
python update_schema.py     # Update database schema if needed
```

## Development

### Testing
```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
pytest
```

### Available Scripts

#### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code

#### Backend
- `uvicorn app.main:app --reload` - Start development server
- `python fix_database.py` - Fix database issues
- `python update_schema.py` - Update database schema

## Project Status

This project is actively under development with a focus on:
- Robust batch processing capabilities
- Real-time calculation engine
- Advanced scenario modeling
- Comprehensive data visualization

## License

This project is licensed under the MIT License.
