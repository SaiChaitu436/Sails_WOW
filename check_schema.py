import psycopg2
from psycopg2.extras import RealDictCursor
import json

# Database credentials
DB_CONFIG = {
    "user": "postgres",
    "password": "Saichaitu123",
    "host": "localhost",
    "port": "5433",
    "database": "SAILS_WOW"
}

def get_table_schema(conn, table_name):
    """Get schema information for a specific table"""
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # Get column information
    cur.execute("""
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = %s
        ORDER BY ordinal_position;
    """, (table_name,))
    
    columns = cur.fetchall()
    
    # Get primary key information
    cur.execute("""
        SELECT 
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = %s
            AND tc.constraint_type = 'PRIMARY KEY';
    """, (table_name,))
    
    primary_keys = [row['column_name'] for row in cur.fetchall()]
    
    # Get foreign key information
    cur.execute("""
        SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = %s;
    """, (table_name,))
    
    foreign_keys = cur.fetchall()
    
    return {
        "columns": columns,
        "primary_keys": primary_keys,
        "foreign_keys": foreign_keys
    }

def get_all_tables(conn):
    """Get all table names in the database"""
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    return [row['table_name'] for row in cur.fetchall()]

def main():
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        print("✓ Connected to database successfully\n")
        
        # Get all tables
        tables = get_all_tables(conn)
        print(f"Found {len(tables)} tables in the database:\n")
        
        # Store schema information
        schema_info = {}
        
        # Check each table
        for table in tables:
            print(f"{'='*80}")
            print(f"Table: {table}")
            print(f"{'='*80}")
            
            schema = get_table_schema(conn, table)
            schema_info[table] = schema
            
            print(f"\nColumns ({len(schema['columns'])}):")
            for col in schema['columns']:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                max_length = f"({col['character_maximum_length']})" if col['character_maximum_length'] else ""
                print(f"  - {col['column_name']:<30} {col['data_type']}{max_length:<15} {nullable}{default}")
            
            if schema['primary_keys']:
                print(f"\nPrimary Keys: {', '.join(schema['primary_keys'])}")
            
            if schema['foreign_keys']:
                print(f"\nForeign Keys:")
                for fk in schema['foreign_keys']:
                    print(f"  - {fk['column_name']} -> {fk['foreign_table_name']}.{fk['foreign_column_name']}")
            
            print("\n")
        
        # Save schema to JSON file
        with open('database_schema.json', 'w') as f:
            # Convert to serializable format
            serializable_schema = {}
            for table, schema in schema_info.items():
                serializable_schema[table] = {
                    "columns": [
                        {
                            "name": col['column_name'],
                            "type": col['data_type'],
                            "max_length": col['character_maximum_length'],
                            "nullable": col['is_nullable'] == 'YES',
                            "default": col['column_default']
                        }
                        for col in schema['columns']
                    ],
                    "primary_keys": schema['primary_keys'],
                    "foreign_keys": [
                        {
                            "column": fk['column_name'],
                            "references_table": fk['foreign_table_name'],
                            "references_column": fk['foreign_column_name']
                        }
                        for fk in schema['foreign_keys']
                    ]
                }
            json.dump(serializable_schema, f, indent=2)
        
        print(f"\n✓ Schema information saved to 'database_schema.json'")
        
        # Check specific tables we care about
        print(f"\n{'='*80}")
        print("KEY TABLES ANALYSIS")
        print(f"{'='*80}\n")
        
        key_tables = ['assessment_answers', 'assessment_results', 'sails_employee_data']
        
        for table in key_tables:
            if table in schema_info:
                print(f"\n{table.upper()}:")
                print("-" * 40)
                cols = [col['column_name'] for col in schema_info[table]['columns']]
                print(f"Columns: {', '.join(cols)}")
                
                # Check for questions_answers column
                if table == 'assessment_results':
                    has_questions_answers = any(col['column_name'] == 'questions_answers' for col in schema_info[table]['columns'])
                    if has_questions_answers:
                        qa_col = next(col for col in schema_info[table]['columns'] if col['column_name'] == 'questions_answers')
                        print(f"✓ questions_answers column exists: {qa_col['data_type']}")
                    else:
                        print("✗ questions_answers column does NOT exist - needs to be added")
            else:
                print(f"\n✗ Table '{table}' does NOT exist")
        
        conn.close()
        print(f"\n✓ Database connection closed")
        
    except psycopg2.Error as e:
        print(f"✗ Database error: {e}")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    main()

