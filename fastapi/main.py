from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from psycopg2.extras import RealDictCursor
from database import get_db_conn
from pydantic import BaseModel
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


# @app.get("/bands/{band}/random-questions")
# def get_random_questions(band: str, db_conn=Depends(get_db_conn)):

#     table_name = f'"{band}"'

#     try:
#         with db_conn as conn:
#             cur = conn.cursor(cursor_factory=RealDictCursor)

#             cur.execute("""
#                 SELECT EXISTS (
#                     SELECT FROM information_schema.tables
#                     WHERE LOWER(table_name) = LOWER(%s)
#                 );
#             """, (band,))

#             exists = cur.fetchone()["exists"]

#             if not exists:
#                 raise HTTPException(
#                     status_code=404,
#                     detail=f"Band table '{band}' does not exist."
#                 )

#             cur.execute(f'SELECT DISTINCT "Category" FROM {table_name};')
#             categories = [row["Category"] for row in cur.fetchall()]

#             if not categories:
#                 raise HTTPException(
#                     status_code=404,
#                     detail="No categories found for this band"
#                 )

#             final_questions = []

#             for category in categories:
#                 cur.execute(
#                     f'SELECT "Category", "Question" FROM {table_name} WHERE "Category" = %s;',
#                     (category,)
#                 )
#                 rows = cur.fetchall()

#                 if rows:
#                     selected = random.sample(rows, min(25, len(rows)))

#                     for r in selected:
#                         final_questions.append({
#                             "band": band,
#                             "category": r["Category"],
#                             "question": r["Question"]
#                         })

#         random.shuffle(final_questions)

#         return {
#             "band": band,
#             "categories_found": len(categories),
#             "total_questions": len(final_questions),
#             "questions": final_questions
#         }

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error: {str(e)}")



# @app.get("/bands/{band}/random-questions")
# def get_random_questions(band: str, db_conn=Depends(get_db_conn)):

#     table_name = f'"{band}"'

#     try:
#         with db_conn as conn:
#             cur = conn.cursor(cursor_factory=RealDictCursor)

#             # Check table
#             cur.execute("""
#                 SELECT EXISTS (
#                     SELECT FROM information_schema.tables
#                     WHERE LOWER(table_name) = LOWER(%s)
#                 );
#             """, (band,))
#             exists = cur.fetchone()["exists"]
#             if not exists:
#                 raise HTTPException(status_code=404, detail=f"Band table '{band}' does not exist.")

#             # Fetch categories
#             cur.execute(f'SELECT DISTINCT "Category" FROM {table_name};')
#             categories = [row["Category"] for row in cur.fetchall()]

#             if not categories:
#                 raise HTTPException(status_code=404, detail="No categories found for this band")

#             final_questions = []
#             all_available_questions = []

#             # Pull up to 25 per category (unique)
#             for category in categories:
#                 cur.execute(
#                     f'SELECT "Category", "Question" FROM {table_name} WHERE "Category" = %s;',
#                     (category,)
#                 )

#                 rows = cur.fetchall()
#                 all_available_questions.extend(rows)

#                 if rows:
#                     limit = min(25, len(rows))
#                     selected = random.sample(rows, limit)

#                     for r in selected:
#                         final_questions.append({
#                             "band": band,
#                             "category": r["Category"],
#                             "question": r["Question"]
#                         })

#             REQUIRED = 125
#             current = len(final_questions)

#             # If less than 125 → fill
#             if current < REQUIRED:
#                 missing = REQUIRED - current
#                 extra = random.choices(all_available_questions, k=missing)
#                 for r in extra:
#                     final_questions.append({
#                         "band": band,
#                         "category": r["Category"],
#                         "question": r["Question"]
#                     })

#             # If more than 125 → trim
#             elif current > REQUIRED:
#                 final_questions = random.sample(final_questions, REQUIRED)

#             # Shuffle final 125
#             random.shuffle(final_questions)

#             return {
#                 "band": band,
#                 "categories_found": len(categories),
#                 "total_questions": len(final_questions),
#                 "questions": final_questions
#             }

#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Error: {str(e)}")



class AnswerPayload(BaseModel):
    employee_id: str
    band: str
    category: str
    question: str
    answer_value: str


@app.post("/assessment/answer")
def save_assessment_answer(data: AnswerPayload, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Check if answer already exists
            cur.execute("""
                SELECT id FROM assessment_answers
                WHERE employee_id=%s AND band=%s AND question=%s;
            """, (data.employee_id, data.band, data.question))

            existing = cur.fetchone()

            if existing:
                # UPDATE existing answer
                cur.execute("""
                    UPDATE assessment_answers
                    SET answer_value=%s, updated_at=NOW()
                    WHERE id=%s;
                """, (data.answer_value, existing["id"]))

            else:
                # INSERT new answer
                cur.execute("""
                    INSERT INTO assessment_answers 
                    (employee_id, band, category, question, answer_value)
                    VALUES (%s, %s, %s, %s, %s);
                """, (data.employee_id, data.band, data.category,
                      data.question, data.answer_value))

        return {"message": "Answer saved successfully"}

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@app.get("/assessment/answers/{employee_id}/{band}")
def get_saved_answers(employee_id: str, band: str, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            cur.execute("""
                SELECT category, question, answer_value
                FROM assessment_answers
                WHERE employee_id=%s AND band=%s;
            """, (employee_id, band))

            results = cur.fetchall()

        return results

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")




class SubmitAssessment(BaseModel):
    employee_id: str
    band: str


@app.post("/assessment/submit")
def submit_assessment(data: SubmitAssessment, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Fetch all answers
            cur.execute("""
                SELECT category, answer_value
                FROM assessment_answers
                WHERE employee_id=%s AND band=%s;
            """, (data.employee_id, data.band))

            answers = cur.fetchall()

            if not answers:
                raise HTTPException(status_code=400, detail="No answers found")

            # Group answers by category
            category_groups = {}
            for ans in answers:
                cat = ans["category"]
                val = float(ans["answer_value"])
                category_groups.setdefault(cat, []).append(val)

            # Calculate average per category
            category_scores = {
                cat: sum(vals) / len(vals)
                for cat, vals in category_groups.items()
            }

            # Overall score = avg of category averages
            total_score = sum(category_scores.values()) / len(category_scores)

            # Insert final results
            cur.execute("""
                INSERT INTO assessment_results
                (employee_number, agreed_band, total_score, category_scores)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
            """, (
                data.employee_id,
                data.band,
                total_score,
                json.dumps(category_scores)
            ))

            result_id = cur.fetchone()["id"]

        return {
            "message": "Assessment submitted",
            "result_id": result_id,
            "total_score": total_score,
            "category_scores": category_scores
        }

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")



@app.get("/assessment/results/{employee_id}/{band}")
def get_assessment_results(employee_id: str, band: str, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            cur.execute("""
                SELECT *
                FROM assessment_results
                WHERE employee_number=%s AND agreed_band=%s
                ORDER BY completed_at DESC
                LIMIT 1;
            """, (employee_id, band))

            return cur.fetchone()

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
