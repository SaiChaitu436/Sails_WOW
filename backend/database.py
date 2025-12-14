import os
import psycopg2
from dotenv import load_dotenv
from contextlib import contextmanager
from fastapi import HTTPException, status
from psycopg2.pool import SimpleConnectionPool


load_dotenv()

def create_pool():
    try:
        return SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            user=os.getenv("POSTGRES_USER"),
            password=os.getenv("POSTGRES_PASSWORD"),
            host=os.getenv("POSTGRES_SERVER"),
            port=os.getenv("POSTGRES_PORT"),
            database=os.getenv("POSTGRES_DB")
        )
    except Exception as e:
        print(f"Error creating connection pool: {e}")
        raise

pool = create_pool()


@contextmanager
def get_db_conn():
    """
    Synchronous context manager for database connections.
    Ensures proper connection handling.
    """
    conn = None
    try:
        conn = pool.getconn()
        yield conn  
        conn.commit()  
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    finally:
        if conn:
            pool.putconn(conn)  
