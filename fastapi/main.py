from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from database import get_db_conn
from pydantic import BaseModel
from typing import List
import psycopg2
import random
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/employeeData/{employee_id}")
async def get_SailsEmployeeData(employee_id: str,db_conn=Depends(get_db_conn)):
    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute("""SELECT * FROM sails_employee_data WHERE "Employee_Number" = %s;""",(employee_id,))
            SailsEmployeeData = cur.fetchone()
        return SailsEmployeeData
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/bands/{band}/random-questions")
def get_random_questions(band: str, db_conn=Depends(get_db_conn)):

    table_name = f'"{band}"'

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE LOWER(table_name) = LOWER(%s)
                );
            """, (band,))

            exists = cur.fetchone()["exists"]

            if not exists:
                raise HTTPException(
                    status_code=404,
                    detail=f"Band table '{band}' does not exist."
                )

            cur.execute(f'SELECT DISTINCT "Category" FROM {table_name};')
            categories = [row["Category"] for row in cur.fetchall()]

            if not categories:
                raise HTTPException(
                    status_code=404,
                    detail="No categories found for this band"
                )

            final_questions = []

            for category in categories:
                cur.execute(
                    f'SELECT "Category", "Question" FROM {table_name} WHERE "Category" = %s;',
                    (category,)
                )
                rows = cur.fetchall()

                if rows:
                    selected = random.sample(rows, min(25, len(rows)))

                    for r in selected:
                        final_questions.append({
                            "band": band,
                            "category": r["Category"],
                            "question": r["Question"]
                        })

        random.shuffle(final_questions)

        return {
            "band": band,
            "categories_found": len(categories),
            "total_questions": len(final_questions),
            "questions": final_questions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.get("/bands/{band}/category/{category}")
def get_questions_by_category(band: str, category: str, db_conn=Depends(get_db_conn)):

    table_name = f'"{band}"'  # Example: "band2A"

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Check if table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE LOWER(table_name) = LOWER(%s)
                );
            """, (band,))

            exists = cur.fetchone()["exists"]

            if not exists:
                raise HTTPException(
                    status_code=404,
                    detail=f"Band table '{band}' does not exist"
                )

            # Fetch questions for specific category
            cur.execute(
                f'SELECT "Category", "Question" FROM {table_name} WHERE "Category" = %s;',
                (category,)
            )

            rows = cur.fetchall()

            if not rows:
                raise HTTPException(
                    status_code=404,
                    detail=f"No questions found for category '{category}' in band '{band}'"
                )

            # Select max 25
            selected = random.sample(rows, min(25, len(rows)))

            # Format results
            final_questions = [
                {
                    "question": r["Question"]
                }
                for r in selected
            ]

        return {
            "band": band,
            "category": category,
            "total_questions": len(final_questions),
            "questions": final_questions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")



class SectionAnswer(BaseModel):
    question: str
    answer_value: str

class SectionSubmitPayload(BaseModel):
    employee_id: str
    band: str
    category: str
    answers: List[SectionAnswer]


@app.post("/assessment/section/submit")
def submit_section_answers(data: SectionSubmitPayload, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            for ans in data.answers:

                # check if answer exists
                cur.execute("""
                    SELECT id FROM assessment_answers
                    WHERE employee_id=%s AND band=%s AND question=%s;
                """, (data.employee_id, data.band, ans.question))

                existing = cur.fetchone()

                if existing:
                    # UPDATE existing record
                    cur.execute("""
                        UPDATE assessment_answers
                        SET answer_value=%s, updated_at=NOW()
                        WHERE id=%s;
                    """, (ans.answer_value, existing["id"]))
                else:
                    # INSERT new record
                    cur.execute("""
                        INSERT INTO assessment_answers
                        (employee_id, band, category, question, answer_value)
                        VALUES (%s, %s, %s, %s, %s);
                    """, (
                        data.employee_id,
                        data.band,
                        data.category,
                        ans.question,
                        ans.answer_value
                    ))

        return {
            "message": "Section submitted successfully",
            "questions_saved": len(data.answers)
        }

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/assessment/history/{employee_id}")
def get_assessment_history(employee_id: str, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            history = []

            # 1️⃣ Get all bands where the user has answered something
            cur.execute("""
                SELECT DISTINCT band 
                FROM assessment_answers
                WHERE employee_id=%s;
            """, (employee_id,))
            bands = [row["band"] for row in cur.fetchall()]

            for band in bands:

                # 🔥 FIX: Your actual PostgreSQL table name = band + bandName
                table_name = f'"band{band}"'

                # 2️⃣ Fetch all answers for this band
                cur.execute("""
                    SELECT category, question, answer_value
                    FROM assessment_answers
                    WHERE employee_id=%s AND band=%s
                    ORDER BY category;
                """, (employee_id, band))
                answers = cur.fetchall()

                answered_count = len(answers)

                # 3️⃣ Count categories for this band from the band table
                cur.execute(f'SELECT COUNT(DISTINCT "Category") AS c FROM {table_name};')
                category_count = cur.fetchone()["c"]

                expected_questions = category_count * 25  # 25 per category

                # 4️⃣ Group answers by category
                sections = {}
                for a in answers:
                    cat = a["category"]
                    if cat not in sections:
                        sections[cat] = []
                    sections[cat].append({
                        "question": a["question"],
                        "answer_value": a["answer_value"]
                    })

                section_list = [
                    {
                        "category": cat,
                        "questions": qlist
                    }
                    for cat, qlist in sections.items()
                ]

                # 5️⃣ Check completion
                if answered_count == expected_questions:

                    # Fetch final result snapshot
                    cur.execute("""
                        SELECT total_score, category_scores, completed_at
                        FROM assessment_results
                        WHERE employee_number=%s AND agreed_band=%s
                        ORDER BY completed_at DESC LIMIT 1;
                    """, (employee_id, band))

                    result = cur.fetchone()

                    history.append({
                        "band": band,
                        "status": "Completed",
                        "completed_at": result["completed_at"],
                        "total_score": result["total_score"],
                        "category_scores": result["category_scores"],
                        "sections": section_list
                    })

                else:

                    history.append({
                        "band": band,
                        "status": "In Progress",
                        "sections": section_list
                    })

        return {
            "employee_id": employee_id,
            "history": history
        }

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
