# Bonus Calculator

A comprehensive web application for calculating employee bonuses with batch processing, real-time calculations, and scenario modeling capabilities.

## Project Structure

```
├── frontend/          # React + TypeScript frontend
├── backend/           # FastAPI Python backend
├── shared/            # Shared types and utilities
├── tasks/             # TaskMaster AI task management
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

## Development

This project uses TaskMaster AI for task management. Use the following commands:

- `task-master list` - View all tasks
- `task-master next` - Find the next task to work on
- `task-master expand --id=<id>` - Break down complex tasks
- `task-master set-status --id=<id> --status=done` - Mark tasks as complete

## License

This project is licensed under the MIT License.
