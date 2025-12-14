"""
Migration script to add questions_answers column to assessment_results table
"""
import psycopg2

# Database credentials
DB_CONFIG = {
    "user": "postgres",
    "password": "Saichaitu123",
    "host": "localhost",
    "port": "5433",
    "database": "SAILS_WOW"
}

def add_questions_answers_column():
    """Add questions_answers column to assessment_results table"""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Check if column already exists
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assessment_results' 
            AND column_name = 'questions_answers';
        """)
        
        if cur.fetchone():
            print("✓ Column 'questions_answers' already exists in assessment_results table")
        else:
            # Add the column
            cur.execute("""
                ALTER TABLE assessment_results 
                ADD COLUMN questions_answers JSONB;
            """)
            conn.commit()
            print("✓ Successfully added 'questions_answers' column to assessment_results table")
        
        cur.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"✗ Database error: {e}")
        if conn:
            conn.rollback()
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    print("Adding questions_answers column to assessment_results table...")
    add_questions_answers_column()

