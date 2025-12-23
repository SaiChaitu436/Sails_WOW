# SAILS WOW

SAILS WOW – Way of Working Assessment Portal empowers candidates to reflect on their capabilities, identify their current band, and take structured actions to grow and succeed within the SAILS ecosystem.

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
  - [Database Setup](#database-setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [PostgresDataIngestion Setup](#postgresdataingestion-setup)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [Dependencies](#dependencies)

## Project Structure

```
Sails Wow/
├── backend/                 # FastAPI backend application
│   ├── main.py             # Main API endpoints
│   ├── database.py         # Database connection handling
│   ├── requirements.txt    # Python dependencies
│   └── .env                # Environment variables (create from .env.example)
├── frontend/               # React frontend application
│   ├── src/               # Source code
│   ├── public/            # Public assets
│   └── package.json       # Node.js dependencies
├── database/               # Database files
│   ├── SAILS_WOW.dump     # PostgreSQL backup file
│   └── schema.sql         # Database schema
├── PostgresDataIngestion/  # dbt project for data ingestion
│   ├── seeds/             # CSV seed files
│   ├── models/            # dbt models
│   ├── profiles.yml       # dbt connection profile
│   ├── dbt_project.yml    # dbt project configuration
│   └── requirements.txt   # dbt dependencies
├── requirements.txt        # Root requirements (all dependencies)
└── README.md              # This file
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.10+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 22+** and npm - [Download Node.js](https://nodejs.org/)
- **PostgreSQL 16+** - [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git** - [Download Git](https://git-scm.com/downloads)

## Setup Instructions

### Database Setup

#### Step 1: Install PostgreSQL

1. Download and install PostgreSQL from the official website
2. During installation, remember the password you set for the `postgres` user
3. Set the port number to 5433 (default is 5432, but this project uses 5433)

#### Step 2: Create Database

1. Open **pgAdmin** or **psql** command line
2. Create a new database in pg admin by right clicking on the database symbol or via cmd-line using:

```sql
CREATE DATABASE SAILS_WOW;
```

#### Step 3: Restore Database Backup

**Option A: Using pgAdmin (GUI)**

1. Open pgAdmin
2. Right-click on the `SAILS_WOW` database
3. Select **Restore...**
4. In the Restore dialog:
   - **Filename**: Browse and select `database/SAILS_WOW.dump`.
   - **Format**: Select `Custom or tar` and browse for the file.
   - **Note**: Select `All Files` in the bottom right of explorer if you do not find the dump file at the desired path/location.
   - Click **Restore**

**Option B: Using Command Line (psql/pg_restore)**

```bash
# Navigate to the database folder
cd database

# Restore the database (replace with your PostgreSQL credentials)
pg_restore -h localhost -p PORT -U USER_NAME -d DB_NAME -v DUMP_FILE_NAME.dump
```

**Note**: If you encounter permission issues, you may need to:
- Ensure PostgreSQL service is running
- Verify the database exists
- Check that the dump file path is correct
- Confirm your PostgreSQL user has sufficient privileges

#### Step 4: Verify Database

After restoration, verify the database was restored correctly:

```sql
-- Connect to SAILS_WOW database
\c SAILS_WOW

-- List all tables
\dt

-- Check a sample table
SELECT * FROM assessment_answers LIMIT 5;
```

### Backend Setup

#### Step 1: Navigate to Backend Directory

```bash
cd backend
```

#### Step 2: Create Virtual Environment (Recommended)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install Dependencies

```bash
# Install requirements
pip install -r requirements.txt

```

#### Step 4: Configure Environment Variables

1. Copy the example environment file:
```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

2. Edit `.env` file and update the following variables:

```env
POSTGRES_USER=postgres_username
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_SERVER=postgres_host # localhost
POSTGRES_PORT=port_number
POSTGRES_DB=SAILS_WOW
```

**Important**: Replace `postgres credentials` with your actual PostgreSQL details.

#### Step 5: Verify Backend Setup

```bash
# Run the server using uvicorn
uvicorn main:app --reload --port 8000
```

The backend should start on `http://localhost:8000`. You can verify by visiting `http://localhost:8000/docs` for the API documentation.

### Frontend Setup

#### Step 1: Navigate to Frontend Directory

```bash
cd frontend
```

#### Step 2: Install Dependencies

```bash
npm install
```

This will install all dependencies listed in `package.json`, including:
- React and React DOM
- React Router
- Axios for API calls
- Bootstrap and React Bootstrap for UI
- Material-UI components
- Date-fns for date manipulation
- Lucide React for icons

#### Step 3: Configure API Endpoint (if needed)

The frontend is configured to connect to `http://localhost:8000` by default. If your backend runs on a different port, update the API base URL in the frontend code.

#### Step 4: Verify Frontend Setup

```bash
npm start
```

The frontend should start on `http://localhost:3000` and automatically open in your browser.

### PostgresDataIngestion Setup (DBT)

#### **NOTE**: If you had already got the table data using backup file `skip` this section.

This section covers setting up dbt (data build tool) for data ingestion and seeding.


#### Step 1: Configure profiles.yml

The `profiles.yml` file contains the database connection configuration. It should already be configured, but verify the settings:

```yaml
PostgresDataIngestion:
  outputs:
    dev:
      type: postgres
      host: host
      port: port
      user: user
      password: password
      dbname: SAILS_WOW
      schema: public
      threads: 1
  target: dev
```

**Important**: These fields are very similar to the `.env` variables of postgres.

**Note**: The `profiles.yml` file location:
- **Project location**: `PostgresDataIngestion/profiles.yml` (if using project-specific profile)

If using a project-specific profile, ensure dbt can find it or copy it to the default location.

#### Step 2: Verify dbt Connection

```bash
# Test the database connection
dbt debug
```

This command will:
- Check if dbt can connect to the database
- Verify the profile configuration
- Check for any configuration issues

#### Step 3: Seed Data

The `seeds/` directory contains CSV files that need to be loaded into the database:

- `band1.csv`, `band1A.csv`, `band1B.csv`
- `band2A.csv`, `band2B.csv`
- `band3A.csv`, `band3B.csv`
- `band4A.csv`, `band4B.csv`
- `band5A.csv`, `band5B.csv`
- `band6A.csv`, `band6B.csv`
- `interpretations_and_focus_area.csv`
- `sails_employee_data.csv`

**Run seed command:**

```bash
# Seed all CSV files
dbt seed

# OR with full refresh (drops existing tables and recreates)
dbt seed --full-refresh
```

**What `--full-refresh` does:**
- Drops existing seed tables if they exist
- Recreates the tables from scratch
- Loads all data from CSV files
- Useful when you need to reset seed data

**Note**: Run `dbt seed --full-refresh` when:
- Setting up the project for the first time
- After making changes to seed CSV files
- When you need to reset seed data to match the CSV files


## Running the Application

### Start Backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

Backend will run on: `http://localhost:8000`

### Start Frontend

```bash
cd frontend
npm start
```

Frontend will run on: `http://localhost:3000`

### Access the Application

Open your browser and navigate to: `http://localhost:3000`

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5433
POSTGRES_DB=SAILS_WOW
```

**Security Note**: Never commit `.env` files to version control. The `.env.example` file is provided as a template.

## Dependencies

### Root Requirements (requirements.txt)

The root `requirements.txt` file contains all dependencies for the entire project:

- **Backend dependencies**: FastAPI, uvicorn, psycopg2-binary, python-dotenv, pydantic
- **dbt dependencies**: dbt-core, dbt-postgres, dbt-bigquery

### Backend Dependencies (requirements.txt)

- `fastapi` - Web framework for building APIs
- `uvicorn[standard]` - ASGI server for FastAPI
- `psycopg2-binary` - PostgreSQL adapter for Python
- `python-dotenv` - Load environment variables from .env file
- `pydantic` - Data validation using Python type annotations

### Frontend Dependencies (frontend/package.json)

- `react` & `react-dom` - React library
- `react-router-dom` - Routing for React
- `axios` - HTTP client for API calls
- `bootstrap` & `react-bootstrap` - UI framework
- `@mui/material` & `@mui/icons-material` - Material-UI components
- `date-fns` - Date utility library
- `lucide-react` - Icon library

### PostgresDataIngestion Dependencies (requirements.txt)

- `dbt` - Installs dbt on ypur machine
- `dbt-core` - Core dbt functionality
- `dbt-postgres` - PostgreSQL adapter for dbt
- `dbt-bigquery` - BigQuery adapter for dbt (optional, for future use)

## Troubleshooting

### Database Connection Issues

1. **Check PostgreSQL service is running**
   - Windows: Services → PostgreSQL
   - Linux: `sudo systemctl status postgresql`
   - Mac: Check Activity Monitor

2. **Verify connection credentials** in `.env` file

3. **Check firewall settings** if connecting to remote database

4. **Verify database exists**: `psql -U postgres -l`

### Backend Issues

1. **Port already in use**: Change port in `main.py` or kill the process using port 8000
2. **Module not found**: Ensure virtual environment is activated and dependencies are installed
3. **Database connection error**: Verify `.env` file configuration

### Frontend Issues

1. **npm install fails**: Clear cache with `npm cache clean --force`
2. **Port 3000 in use**: React will automatically use the next available port
3. **API calls fail**: Verify backend is running and CORS is configured

### dbt Issues

1. **Connection failed**: Run `dbt debug` to diagnose connection issues
2. **Profile not found**: Ensure `profiles.yml` is in the correct location
3. **Seed fails**: Check CSV file format and database permissions

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [dbt Documentation](https://docs.getdbt.com/)


