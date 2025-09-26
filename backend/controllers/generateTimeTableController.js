// backend/controllers/generateTimeTableController.js
import Classroom from "../models/Classroom.js";
import Subject from "../models/Subject.js";
import User from "../models/User.js"; // Faculties are Users with role = "faculty"
import Timetable from "../models/Timetable.js";

/**
 * Utility: build slot objects
 */
function buildSlots(days, slotsPerDay, slotTimes) {
  const slots = [];
  for (let d = 0; d < days.length; d++) {
    for (let s = 0; s < slotsPerDay; s++) {
      slots.push({
        day: days[d],
        slotIndex: s,
        time: slotTimes && slotTimes[s] ? slotTimes[s] : null,
        key: `${days[d]}-S${s}`,
      });
    }
  }
  return slots;
}

/**
 * Main controller: generate timetable
 */
export const generateTimetable = async (req, res) => {
  try {
    let {
      academicYear,
      semester,
      department,
      days: daysInput,
      slotsPerDay = 8,
      slotTimes = null,
      options = 1,
      debug = false,
    } = req.body;

    // Convert semester to number if sent as string
    semester = Number(semester);

    if (!academicYear || !semester || !department) {
      return res.status(400).json({
        ok: false,
        message: "academicYear, semester and department are required.",
      });
    }

    // Default weekdays
    const days =
      Array.isArray(daysInput) && daysInput.length > 0
        ? daysInput
        : ["Mon", "Tue", "Wed", "Thu", "Fri"];

    // 1. Fetch entities
    const [classrooms, subjects, faculties, fixedSlots] = await Promise.all([
      Classroom.find({}).lean(),
      Subject.find({ department, semester }).lean(),
      User.find({ role: "faculty", department }).lean(),
      Timetable.find({ academicYear, semester, department, status: "approved" }).lean(),
    ]);

    if (!subjects.length) {
      return res.status(400).json({ ok: false, message: "No subjects found." });
    }
    if (!faculties.length) {
      return res.status(400).json({ ok: false, message: "No faculties found." });
    }

    // 2. Build slots
    const slots = buildSlots(days, slotsPerDay, slotTimes);

    // Faculty map
    const facultyMap = {};
    faculties.forEach((f) => {
      facultyMap[f._id.toString()] = { doc: f, assignedCount: 0, perDayCount: {} };
    });

    // Room map
    const roomMap = {};
    classrooms.forEach((r) => {
      roomMap[r._id.toString()] = { doc: r, bookings: new Set() };
    });

    // Canvas (pre-assigned)
    const timetableCanvas = {};
    const suggestions = [];

    fixedSlots.forEach((ft) => {
      const key = `${ft.day}-S${ft.slotIndex}`;
      if (timetableCanvas[key]) {
        suggestions.push({
          type: "fixed_conflict",
          message: `Fixed slot collision at ${key} between ${timetableCanvas[key].subjectId} and ${ft.courseId}`,
          details: { existing: timetableCanvas[key], new: ft },
        });
      } else {
        timetableCanvas[key] = {
          subjectId: ft.courseId,
          facultyId: ft.facultyId,
          roomId: ft.roomId,
          fixed: true,
        };
        if (roomMap[ft.roomId]) roomMap[ft.roomId].bookings.add(key);
      }
    });

    // 3. Build worklist
    const worklist = subjects.map((s) => ({
      subjectId: s._id.toString(),
      facultyId: s.facultyAssigned?.toString(),
      remaining: s.credits || 3,
    }));

    // 4. Generator function
    function produceOneTimetable() {
      const assignments = { ...timetableCanvas };
      const roomBookingLocal = {};
      Object.keys(roomMap).forEach(
        (rid) => (roomBookingLocal[rid] = new Set([...roomMap[rid].bookings]))
      );

      const facultyLocal = {};
      Object.keys(facultyMap).forEach(
        (fid) =>
          (facultyLocal[fid] = { assignedCount: 0, perDayCount: {}, doc: facultyMap[fid].doc })
      );

      function findSlotFor(item) {
        for (const slot of slots) {
          const key = slot.key;
          if (assignments[key]) continue;

          const facultyId = item.facultyId;
          if (!facultyId || !facultyLocal[facultyId]) continue;

          let pickedRoomId = null;
          for (const rid of Object.keys(roomBookingLocal)) {
            if (roomBookingLocal[rid].has(key)) continue;
            pickedRoomId = rid;
            break;
          }
          if (!pickedRoomId) continue;

          assignments[key] = {
            subjectId: item.subjectId,
            facultyId,
            roomId: pickedRoomId,
            day: slot.day,
            slotIndex: slot.slotIndex,
            time: slot.time,
          };
          roomBookingLocal[pickedRoomId].add(key);
          facultyLocal[facultyId].assignedCount++;
          facultyLocal[facultyId].perDayCount[slot.day] =
            (facultyLocal[facultyId].perDayCount[slot.day] || 0) + 1;
          return true;
        }
        return false;
      }

      const wl = worklist.map((w) => ({ ...w }));
      for (const w of wl) {
        while (w.remaining > 0) {
          if (!findSlotFor(w)) break;
          w.remaining--;
        }
      }

      const unresolved = wl.filter((w) => w.remaining > 0);
      return { assignments, unresolved };
    }

    // 5. Produce options
    const timetableOptions = [];
    for (let i = 0; i < Math.max(1, options); i++) {
      const result = produceOneTimetable();
      timetableOptions.push({ id: i + 1, assignments: result.assignments, unresolved: result.unresolved });
    }

    // 6. Conflict report
    const conflictReport = [];
    timetableOptions.forEach((opt) => {
      opt.unresolved.forEach((u) =>
        conflictReport.push({
          type: "unresolved",
          message: `Could not schedule ${u.remaining} session(s) for subject ${u.subjectId}`,
          details: u,
        })
      );
    });
    if (suggestions.length) conflictReport.push(...suggestions);

    // 7. Response
    return res.status(200).json({
      ok: true,
      message: "Generated timetable.",
      options: timetableOptions,
      conflictReport,
      debug: debug
        ? { counts: { subjects: subjects.length, faculties: faculties.length, classrooms: classrooms.length } }
        : undefined,
    });
  } catch (err) {
    console.error("Timetable generation error:", err);
    return res.status(500).json({
      ok: false,
      message: "Internal error while generating timetable.",
      error: err.message,
    });
  }
};
