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

class SectionAnswer(BaseModel):
    question: str
    answer_value: str

class SectionSubmitPayload(BaseModel):
    employee_id: str
    band: str
    category: str
    answers: List[SectionAnswer]

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


@app.post("/assessment/section/submit")
def submit_section_answers(data: SectionSubmitPayload, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Save answers to assessment_answers table
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

            # Check if assessment is completed (all categories answered)
            # Band format: if band is "2A", table is "band2A"; if band is "band2A", use as is
            band_name = data.band if data.band.startswith('band') else f'band{data.band}'
            table_name = f'"{band_name}"'
            
            # Get total expected categories
            cur.execute(f'SELECT COUNT(DISTINCT "Category") AS c FROM {table_name};')
            category_count = cur.fetchone()["c"]
            expected_questions = category_count * 25  # 25 per category

            # Count total answered questions for this band
            cur.execute("""
                SELECT COUNT(*) AS count
                FROM assessment_answers
                WHERE employee_id=%s AND band=%s;
            """, (data.employee_id, data.band))
            answered_count = cur.fetchone()["count"]

            is_completed = answered_count >= expected_questions

            response_data = {
                "message": "Section submitted successfully",
                "questions_saved": len(data.answers),
                "is_completed": is_completed
            }

            # If assessment is completed, calculate scores and move to assessment_results
            if is_completed:
                # Fetch all answers for this band
                cur.execute("""
                    SELECT category, question, answer_value
                    FROM assessment_answers
                    WHERE employee_id=%s AND band=%s
                    ORDER BY category;
                """, (data.employee_id, data.band))
                all_answers = cur.fetchall()

                # Calculate category scores
                category_scores_dict = {}
                category_totals = {}

                for answer in all_answers:
                    cat = answer["category"]
                    answer_value = int(answer["answer_value"]) if answer["answer_value"].isdigit() else 0
                    
                    if cat not in category_scores_dict:
                        category_scores_dict[cat] = 0
                        category_totals[cat] = 0
                    
                    category_scores_dict[cat] += answer_value
                    category_totals[cat] += 1

                # Calculate percentage scores per category
                category_scores_list = []
                total_score_sum = 0
                total_max_score = 0

                for cat, score in category_scores_dict.items():
                    max_score = category_totals[cat] * 5  # Max score per question is 5
                    percentage = (score / max_score * 100) if max_score > 0 else 0
                    category_scores_list.append({
                        "category": cat,
                        "score": round(percentage, 2)
                    })
                    total_score_sum += score
                    total_max_score += max_score

                # Calculate overall total score percentage
                total_score = (total_score_sum / total_max_score * 100) if total_max_score > 0 else 0

                # Convert category_scores to JSON string for database
                category_scores_json = json.dumps(category_scores_list)
                
                # Store all questions and answers as JSON for history viewing
                # Group answers by category for storage
                answers_by_category = {}
                for answer in all_answers:
                    cat = answer["category"]
                    if cat not in answers_by_category:
                        answers_by_category[cat] = []
                    answers_by_category[cat].append({
                        "question": answer["question"],
                        "answer_value": answer["answer_value"]
                    })
                
                # Convert to list format for storage
                answers_list = [
                    {
                        "category": cat,
                        "questions": qlist
                    }
                    for cat, qlist in answers_by_category.items()
                ]
                answers_json = json.dumps(answers_list)

                # Check if result already exists
                cur.execute("""
                    SELECT id FROM assessment_results
                    WHERE employee_number=%s AND agreed_band=%s;
                """, (data.employee_id, data.band))
                existing_result = cur.fetchone()

                if existing_result:
                    # Update existing result with questions/answers
                    cur.execute("""
                        UPDATE assessment_results
                        SET total_score=%s, category_scores=%s, questions_answers=%s, completed_at=NOW()
                        WHERE id=%s;
                    """, (round(total_score, 2), category_scores_json, answers_json, existing_result["id"]))
                else:
                    # Insert new result with questions/answers
                    cur.execute("""
                        INSERT INTO assessment_results
                        (employee_number, agreed_band, total_score, category_scores, questions_answers, completed_at)
                        VALUES (%s, %s, %s, %s, %s, NOW());
                    """, (data.employee_id, data.band, round(total_score, 2), category_scores_json, answers_json))

                # Delete all data from assessment_answers for this employee and band (move to assessment_results)
                cur.execute("""
                    DELETE FROM assessment_answers
                    WHERE employee_id=%s AND band=%s;
                """, (data.employee_id, data.band))

                response_data["total_score"] = round(total_score, 2)
                response_data["category_scores"] = category_scores_list

        return response_data

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@app.get("/assessment/history/{employee_id}")
def get_assessment_history(employee_id: str, db_conn=Depends(get_db_conn)):

    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            history = []

            # 1️⃣ Get all bands from assessment_results (completed assessments)
            cur.execute("""
                SELECT DISTINCT agreed_band AS band
                FROM assessment_results
                WHERE employee_number=%s;
            """, (employee_id,))
            bands_from_results = [row["band"] for row in cur.fetchall()]

            # 2️⃣ Get all bands from assessment_answers (ongoing assessments)
            cur.execute("""
                SELECT DISTINCT band 
                FROM assessment_answers
                WHERE employee_id=%s;
            """, (employee_id,))
            bands_from_answers = [row["band"] for row in cur.fetchall()]

            # Combine and get unique bands
            all_bands = list(set(bands_from_answers + bands_from_results))

            for band in all_bands:

                # Band format: if band is "2A", table is "band2A"; if band is "band2A", use as is
                band_name = band if band.startswith('band') else f'band{band}'
                table_name = f'"{band_name}"'

                # 3️⃣ Check if assessment is completed (exists in assessment_results)
                cur.execute("""
                    SELECT total_score, category_scores, completed_at, questions_answers
                    FROM assessment_results
                    WHERE employee_number=%s AND agreed_band=%s
                    ORDER BY completed_at DESC LIMIT 1;
                """, (employee_id, band))

                result = cur.fetchone()

                if result:
                    # Assessment is completed - read from assessment_results
                    category_scores = result["category_scores"]
                    # If category_scores is a string (JSON), parse it
                    if isinstance(category_scores, str):
                        try:
                            category_scores = json.loads(category_scores)
                        except:
                            category_scores = []

                    # Get questions and answers from assessment_results
                    questions_answers = result.get("questions_answers")
                    section_list = []
                    
                    if questions_answers:
                        # If questions_answers is a string (JSON), parse it
                        if isinstance(questions_answers, str):
                            try:
                                section_list = json.loads(questions_answers)
                            except:
                                section_list = []
                        elif isinstance(questions_answers, list):
                            section_list = questions_answers
                    else:
                        # Fallback: if questions_answers column doesn't exist or is null, try to reconstruct from assessment_answers
                        # (This handles legacy data or if column wasn't created yet)
                        cur.execute("""
                            SELECT category, question, answer_value
                            FROM assessment_answers
                            WHERE employee_id=%s AND band=%s
                            ORDER BY category;
                        """, (employee_id, band))
                        answers = cur.fetchall()
                        
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

                    history.append({
                        "band": band,
                        "status": "Completed",
                        "completed_at": result["completed_at"].isoformat() if result["completed_at"] else None,
                        "total_score": float(result["total_score"]) if result["total_score"] else 0,
                        "category_scores": category_scores,
                        "sections": section_list
                    })
                else:
                    # Assessment is in progress - read from assessment_answers
                    cur.execute("""
                        SELECT category, question, answer_value
                        FROM assessment_answers
                        WHERE employee_id=%s AND band=%s
                        ORDER BY category;
                    """, (employee_id, band))
                    answers = cur.fetchall()

                    # Group answers by category
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



@app.get("/assessment/{category}/{employee_id}")
def get_category_info(category: str, employee_id: str, db_conn=Depends(get_db_conn)):
    try:
        with db_conn as conn:
            cur = conn.cursor(cursor_factory=RealDictCursor)

            # Get employee's band to find the correct question table
            cur.execute("""
                SELECT "Agreed_Band" 
                FROM sails_employee_data 
                WHERE "Employee_Number" = %s;
            """, (employee_id,))
            employee_data = cur.fetchone()
            
            if not employee_data:
                raise HTTPException(status_code=404, detail="Employee not found")
            
            band = employee_data["Agreed_Band"]
            band_name = band if band.startswith('band') else f'band{band}'
            table_name = f'"{band_name}"'

            # Map frontend category names to database category names
            category_mapping = {
                "Communication": "Self evaluation Communication",
                "Adaptability & Learning Agility": "Self evalauation Adaptability & Learning Agility",
                "Teamwork & Collaboration": "Self evaluation Teamwork & Collaboration",
                "Accountability & Ownership": "Self evalauation Accountability & Ownership",
                "Problem Solving & Critical Thinking": "Self evaluation Problem Solving & Critical Thinking"
            }
            
            # Use mapped category name or original if not in mapping
            db_category = category_mapping.get(category, category)

            # Get all questions for this category from the band table
            cur.execute(f'SELECT "Question" FROM {table_name} WHERE "Category" = %s;', (db_category,))
            all_questions = [row["Question"] for row in cur.fetchall()]

            # Get user's answers for this category (check both original and mapped category names)
            cur.execute("""
                SELECT question, answer_value
                FROM assessment_answers
                WHERE (category = %s OR category = %s)
                  AND employee_id = %s;
            """, (category, db_category, employee_id))

            answers_dict = {row["question"]: row["answer_value"] for row in cur.fetchall()}

            # Combine questions with answers
            questions_with_answers = []
            for question in all_questions:
                questions_with_answers.append({
                    "question": question,
                    "answer_value": answers_dict.get(question, None),
                    "is_answered": question in answers_dict
                })

        return {
            "employee_id": employee_id,
            "category": category,
            "band": band,
            "total_questions": len(questions_with_answers),
            "total_answers": len(answers_dict),
            "questions": questions_with_answers
        }

    except psycopg2.Error as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )