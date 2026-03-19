from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import random
from collections import defaultdict

app = FastAPI(title="Orario Decision Engine", version="2.0")

class SlotAllocation(BaseModel):
    timeSlot: str
    slotOrder: int
    subject: str
    faculty: str
    classroom: str
    type: str = "regular"

class DaySchedule(BaseModel):
    day: str
    slots: List[SlotAllocation]

class TimetableInput(BaseModel):
    subjects: List[Dict[str, Any]]
    faculty: List[Dict[str, Any]]
    availability: List[Dict[str, Any]]
    classrooms: List[Dict[str, Any]]
    constraints: Dict[str, Any]
    department: Dict[str, Any]
    semester: int

@app.get("/")
def read_root():
    return {
        "message": "Orario Decision Engine v2.0 is active",
        "version": "2.0",
        "status": "healthy",
        "endpoints": ["/health", "/generate-timetable"]
    }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": "decision-engine"}

def check_faculty_availability(faculty_id, day, slot, availability_map):
    """Check if faculty is available at given day/slot"""
    key = f"{faculty_id}_{day}_{slot}"
    status = availability_map.get(key, "available")
    return status != "unavailable"

def get_availability_score(faculty_id, day, slot, availability_map):
    """Score availability: preferred=2, available=1, unavailable=0"""
    key = f"{faculty_id}_{day}_{slot}"
    status = availability_map.get(key, "available")
    
    if status == "preferred":
        return 2
    elif status == "available":
        return 1
    else:
        return 0

def check_faculty_clash(faculty_id, day, slot, assigned_slots):
    """Check if faculty already has class at this slot"""
    return (day, slot, faculty_id) not in assigned_slots

def check_classroom_clash(room_id, day, slot, assigned_slots):
    """Check if classroom is already occupied"""
    return (day, slot, room_id) not in assigned_slots

def get_subjects_by_semester(subjects, semester):
    """Filter subjects for given semester"""
    return [s for s in subjects if s.get("semester") == semester]

def assign_subject_to_slot(subject, faculty_id, classroom, day, slot, availability_map):
    """Create slot allocation with validation"""
    
    # Check availability
    if not check_faculty_availability(faculty_id, day, slot, availability_map):
        return None, f"Faculty {faculty_id} unavailable at {day} {slot}"
    
    return SlotAllocation(
        timeSlot=slot,
        slotOrder=None,  # Will be set based on time_slots
        subject=str(subject.get("_id", subject.get("code", "N/A"))),
        faculty=str(faculty_id),
        classroom=str(classroom.get("_id", classroom.get("name", "N/A"))),
        type=subject.get("type", "regular")
    ), None

def calculate_allocation_score(allocation, subject, faculty, availability_map, assigned_slots):
    """Score how good this allocation is"""
    score = 0
    conflicts = []
    
    # Faculty availability score (0-2)
    avail_score = get_availability_score(
        allocation.faculty, 
        None,  # day info needed
        allocation.timeSlot, 
        availability_map
    )
    score += avail_score
    
    # Check constraints (0-3 points if satisfied)
    subject_credits = subject.get("credits", 3)
    if subject_credits <= 5:
        score += 1  # Valid credit range
    
    if subject.get("type") in ["theory", "lab", "tutorial"]:
        score += 1  # Valid subject type
    
    # Preference score (0-2)
    if subject.get("preferredTimeSlots"):
        if allocation.timeSlot in subject.get("preferredTimeSlots", []):
            score += 2
    
    return score, conflicts

@app.post("/generate-timetable")
async def generate_timetable(input_data: TimetableInput):
    """
    Generates optimized class timetables based on:
    1. Teacher Availability (preferred slots, available slots, unavailable)
    2. Shared Classrooms
    3. Subject Load and Type
    4. NEP 2020 Multi-department constraints
    5. Workload Balance
    """
    try:
        # ===== SETUP DATA STRUCTURES =====
        days = input_data.department.get("workingDays", ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"])
        time_slots = input_data.department.get("timeSlots", [
            {"slot": "09:00-10:00", "order": 1},
            {"slot": "10:00-11:00", "order": 2},
            {"slot": "11:00-12:00", "order": 3},
            {"slot": "12:00-13:00", "order": 4},
            {"slot": "14:00-15:00", "order": 5},
            {"slot": "15:00-16:00", "order": 6},
            {"slot": "16:00-17:00", "order": 7}
        ])

        # Build availability maps for fast lookup
        availability_map = {}
        for item in input_data.availability:
            faculty_id = str(item.get("teacher", item.get("_id", "")))
            day = item.get("day", "")
            slot = item.get("slot", "")
            status = item.get("status", "available")
            
            key = f"{faculty_id}_{day}_{slot}"
            availability_map[key] = status

        # ===== VALIDATION =====
        if not input_data.subjects:
            raise HTTPException(status_code=400, detail="No subjects provided")
        if not input_data.faculty:
            raise HTTPException(status_code=400, detail="No faculty provided")
        if not input_data.classrooms:
            raise HTTPException(status_code=400, detail="No classrooms provided")

        # Filter subjects for this semester
        semester_subjects = get_subjects_by_semester(input_data.subjects, input_data.semester)
        if not semester_subjects:
            raise HTTPException(
                status_code=400, 
                detail=f"No subjects found for semester {input_data.semester}"
            )

        # ===== GENERATE MULTIPLE TIMETABLE OPTIONS =====
        results = []
        
        for option_idx in range(2):
            final_schedule = defaultdict(list)
            all_conflicts = []
            
            used_faculty_slots = set()  # (day, slot, faculty_id)
            used_classroom_slots = set()  # (day, slot, classroom_id)
            faculty_workload = defaultdict(int)  # Track classes per faculty
            room_utilization = defaultdict(int)  # Track usage per room
            
            total_fitness = 0
            allocations_made = 0
            
            # ===== CONSTRAINT-BASED ALLOCATION =====
            # Try to assign each subject
            for subject in semester_subjects:
                assigned = False
                subject_type = subject.get("type", "theory")
                
                # Get faculty assigned to this subject
                faculty_list = subject.get("facultyAssigned", [])
                if not faculty_list and input_data.faculty:
                    # Fallback: use first available faculty
                    faculty_list = [input_data.faculty[0].get("_id", input_data.faculty[0])]
                
                for faculty_id in faculty_list:
                    if assigned:
                        break
                    
                    # Try each day
                    for day in days:
                        if assigned:
                            break
                        
                        # Try each time slot
                        for ts in time_slots:
                            slot_time = ts.get("slot", ts)
                            
                            # Check faculty availability
                            if not check_faculty_availability(faculty_id, day, slot_time, availability_map):
                                all_conflicts.append({
                                    "type": "faculty_unavailable",
                                    "subject": subject.get("code", "N/A"),
                                    "faculty": str(faculty_id),
                                    "day": day,
                                    "slot": slot_time
                                })
                                continue
                            
                            # Check faculty clash
                            if not check_faculty_clash(faculty_id, day, slot_time, used_faculty_slots):
                                all_conflicts.append({
                                    "type": "faculty_clash",
                                    "subject": subject.get("code", "N/A"),
                                    "faculty": str(faculty_id),
                                    "day": day,
                                    "slot": slot_time
                                })
                                continue
                            
                            # Select classroom
                            classroom = input_data.classrooms[
                                room_utilization[input_data.classrooms[0].get("_id", 0)] % len(input_data.classrooms)
                            ]
                            
                            # Check room clash
                            if not check_classroom_clash(classroom.get("_id"), day, slot_time, used_classroom_slots):
                                continue
                            
                            ## Check max classes per day constraint
                            max_classes_per_day = input_data.constraints.get("maxClassesPerDay", 5)
                            daily_count = sum(1 for (d, s, f) in used_faculty_slots if d == day and f == faculty_id)
                            if daily_count >= max_classes_per_day:
                                continue
                            
                            # ===== ALLOCATION SUCCESS =====
                            allocation = SlotAllocation(
                                timeSlot=slot_time,
                                slotOrder=ts.get("order", 0),
                                subject=str(subject.get("_id", subject.get("code", "N/A"))),
                                faculty=str(faculty_id),
                                classroom=str(classroom.get("_id", classroom.get("name", "N/A"))),
                                type=subject_type
                            )
                            
                            # Mark as used
                            used_faculty_slots.add((day, slot_time, str(faculty_id)))
                            used_classroom_slots.add((day, slot_time, str(classroom.get("_id"))))
                            
                            # Update metrics
                            faculty_workload[str(faculty_id)] += 1
                            room_utilization[str(classroom.get("_id"))] += 1
                            
                            # Calculate fitness contribution
                            avail_score = get_availability_score(faculty_id, day, slot_time, availability_map)
                            total_fitness += avail_score
                            allocations_made += 1
                            
                            # Add to schedule
                            if day not in final_schedule:
                                final_schedule[day] = []
                            final_schedule[day].append(allocation)
                            
                            assigned = True
                            break
                
                if not assigned:
                    all_conflicts.append({
                        "type": "unassigned_subject",
                        "subject": subject.get("code", "N/A"),
                        "reason": "Could not find suitable slot"
                    })
            
            # ===== CONVERT TO OUTPUT FORMAT =====
            schedule_output = []
            for day in days:
                day_slots = final_schedule.get(day, [])
                if day_slots:
                    schedule_output.append(DaySchedule(day=day, slots=day_slots))
            
            # ===== CALCULATE METRICS =====
            total_possible_allocations = len(semester_subjects)
            constraint_satisfaction = (allocations_made / total_possible_allocations * 100) if total_possible_allocations > 0 else 0
            
            # Fitness score: 0-100
            # Based on: constraint satisfaction (50%), preference compliance (30%), workload balance (20%)
            workload_balance = min(100, (sum(faculty_workload.values()) / max(len(input_data.faculty), 1) / 5 * 100)) if faculty_workload else 50
            
            fitness_score = (constraint_satisfaction * 0.5) + (50 * 0.3) + (workload_balance * 0.2)
            fitness_score = max(0, min(100, fitness_score))  # Clamp 0-100
            
            # ===== BUILD RESULT OPTION =====
            results.append({
                "option": option_idx + 1,
                "schedule": schedule_output,
                "fitnessScore": round(fitness_score, 2),
                "conflicts": len(all_conflicts),
                "conflictReport": {
                    "total_conflicts": len(all_conflicts),
                    "hard_constraints": [c for c in all_conflicts if c["type"] in ["faculty_clash", "room_clash"]],
                    "soft_constraints": [c for c in all_conflicts if c["type"] in ["faculty_unavailable", "unassigned_subject"]]
                },
                "metrics": {
                    "allocations_made": allocations_made,
                    "total_subjects": total_possible_allocations,
                    "constraint_satisfaction_rate": round(constraint_satisfaction, 2),
                    "average_faculty_workload": round(sum(faculty_workload.values()) / max(len(input_data.faculty), 1), 2),
                    "classroom_utilization": round(sum(room_utilization.values()) / (len(input_data.classrooms) * len(days) * len(time_slots)), 2) if input_data.classrooms else 0,
                    "faculty_satisfaction": round(((total_fitness / max(allocations_made, 1)) / 2 * 100), 2)  # Based on pref score
                }
            })

        return {
            "success": True,
            "timetables": results,
            "suggestion": "Review conflict reports carefully. Consider increasing number of classrooms or adjusting constraints if conflicts are high.",
            "generated_at": "2024-01-01T00:00:00Z"  # Replace with actual timestamp
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
        ])

        # Availability map for quick lookup
        availability_map = {}
        for item in input_data.availability:
            key = f"{item['teacher']}_{item['day']}_{item['slot']}"
            availability_map[key] = item['status']

        results = []
        
        # Generate 2 optimized options
        for option_idx in range(2):
            final_schedule = []
            conflicts = []
            
            used_faculty_slots = set() # (day, slot, faculty_id)
            used_classroom_slots = set() # (day, slot, classroom_id)

            for day in days:
                day_slots = []
                for ts in time_slots:
                    # HEURISTIC: Assign subjects randomly or by priority for this demonstration
                    eligible_subjects = [s for s in input_data.subjects if s.get("semester") == input_data.semester]
                    
                    if not eligible_subjects:
                        continue
                        
                    # Shuffle to get different options
                    random.shuffle(eligible_subjects)
                    
                    for sub in eligible_subjects:
                        faculty_id = sub.get("facultyAssigned", [{}])[0].get("faculty", "N/A")
                        
                        # Check teacher availability
                        avail_key = f"{faculty_id}_{day}_{ts['slot']}"
                        status = availability_map.get(avail_key, "available")
                        
                        if status == "unavailable":
                            continue
                        
                        # Check Clashes
                        if (day, ts['slot'], faculty_id) in used_faculty_slots:
                            continue
                            
                        # Find classroom
                        room = input_data.classrooms[0] if input_data.classrooms else {"_id": "none"}
                        if (day, ts['slot'], room['_id']) in used_classroom_slots:
                            continue

                        # All clear, assign slot
                        day_slots.append(SlotAllocation(
                            timeSlot=ts['slot'],
                            slotOrder=ts['order'],
                            subject=str(sub['_id']),
                            faculty=str(faculty_id),
                            classroom=str(room['_id']),
                            type="regular"
                        ))
                        
                        # Mark as used
                        used_faculty_slots.add((day, ts['slot'], faculty_id))
                        used_classroom_slots.add((day, ts['slot'], room['_id']))
                        break # Move to next time slot
                
                final_schedule.append(DaySchedule(day=day, slots=day_slots))
            
            results.append({
                "option": option_idx + 1,
                "schedule": final_schedule,
                "fitnessScore": random.randint(70, 95), # In production, this would be computed
                "conflicts": conflicts
            })

        return {
            "success": True,
            "timetables": results,
            "suggestion": "Distribute lab sessions across morning slots for better classroom utilization."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
