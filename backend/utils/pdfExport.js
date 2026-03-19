/**
 * PDF Export Service for Timetables
 * Generates professional PDF timetables with NEP 2020 compliance details
 * Dependencies: npm install pdfkit html2canvas
 */

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

/**
 * Create a comprehensive timetable PDF
 */
export const generateTimetablePDF = async (timetable, department, subjects, filename) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 30
      });

      // Create write stream
      const writeStream = fs.createWriteStream(filename);
      doc.pipe(writeStream);

      // Add header
      addHeader(doc, department, timetable);

      // Add department and timetable info
      addTimetableInfo(doc, department, timetable);

      // Add main timetable grid
      addTimetableGrid(doc, timetable, department);

      // Add class details section
      addClassDetails(doc, timetable, subjects);

      // Add faculty assignments
      addFacultyAssignments(doc, timetable);

      // Add classroom assignments
      addClassroomAssignments(doc, timetable);

      // Add constraints and conflicts summary
      addConstraintsSummary(doc, timetable);

      // Add nearer page if needed
      if (timetable.deliveryConfig?.mode !== "offline" || timetable.experientialLearningSchedule?.length > 0) {
        doc.addPage();
        addNEP2020Section(doc, timetable);
      }

      // Add footer with metadata
      addFooter(doc, timetable);

      // Finalize
      doc.end();

      writeStream.on("finish", () => {
        resolve(filename);
      });

      writeStream.on("error", reject);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Add header with institution and document info
 */
const addHeader = (doc, department, timetable) => {
  const pageWidth = doc.page.width;

  // Title
  doc.fontSize(18).font("Helvetica-Bold").text("TIMETABLE", { align: "center" });
  doc.moveDown(0.3);

  // Institution and department
  doc.fontSize(11).font("Helvetica").text(
    `Department of ${department.name} (${department.code})`,
    { align: "center" }
  );
  doc.fontSize(10).text(
    `Semester ${timetable.semester} | Academic Year ${timetable.academicYear}`,
    { align: "center" }
  );

  doc.moveDown(0.5);
  doc.strokeColor("#cccccc").lineWidth(1).moveTo(30, doc.y).lineTo(pageWidth - 30, doc.y).stroke();
  doc.moveDown(0.5);
};

/**
 * Add timetable metadata
 */
const addTimetableInfo = (doc, department, timetable) => {
  const leftCol = 30;
  const rightCol = 300;
  const lineHeight = 16;

  doc.fontSize(10).font("Helvetica-Bold").text("Timetable Information", leftCol, doc.y);
  doc.moveDown(0.3);

  doc.font("Helvetica");
  doc.text(`Title:`, leftCol, doc.y, { width: 100 });
  doc.text(timetable.title, leftCol + 100, doc.y - lineHeight, { width: 200 });
  doc.moveDown(0.3);

  doc.text(`Status:`, leftCol, doc.y, { width: 100 });
  doc.text(timetable.status.toUpperCase(), leftCol + 100, doc.y - lineHeight);
  doc.moveDown(0.3);

  doc.text(`Generated:`, leftCol, doc.y, { width: 100 });
  doc.text(new Date(timetable.createdAt).toLocaleDateString(), leftCol + 100, doc.y - lineHeight);
  doc.moveDown(0.3);

  doc.text(`Version:`, leftCol, doc.y, { width: 100 });
  doc.text(timetable.version.toString(), leftCol + 100, doc.y - lineHeight);
  
  if (timetable.optimizationMetrics?.fitnessScore) {
    doc.text(`Fitness Score:`, leftCol, doc.y, { width: 100 });
    doc.text(
      `${timetable.optimizationMetrics.fitnessScore}%`,
      leftCol + 100,
      doc.y - lineHeight
    );
  }

  doc.moveDown(0.8);
};

/**
 * Add main timetable grid
 */
const addTimetableGrid = (doc, timetable, department) => {
  doc.fontSize(11).font("Helvetica-Bold").text("Weekly Schedule", 30, doc.y);
  doc.moveDown(0.3);

  const pageWidth = doc.page.width;
  const tableWidth = pageWidth - 60;
  const colWidth = tableWidth / 6; // Day + 5 slots
  let startX = 30;
  let startY = doc.y;

  // Header row (Days)
  doc.fontSize(9).font("Helvetica-Bold");
  doc.rect(startX, startY, colWidth, 20).stroke();
  doc.text("Time", startX + 2, startY + 3, { width: colWidth - 4 });

  const days = department.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  days.forEach((day, idx) => {
    doc.rect(startX + colWidth * (idx + 1), startY, colWidth, 20).stroke();
    doc.text(day.substring(0, 3), startX + colWidth * (idx + 1) + 2, startY + 3, {
      width: colWidth - 4
    });
  });

  // Get time slots
  const timeSlots = department.timeSlots || [];
  let currentY = startY + 20;

  timeSlots.slice(0, 5).forEach((slot, slotIdx) => {
    // Time slot column
    doc.fontSize(8).font("Helvetica");
    doc.rect(startX, currentY, colWidth, 25).stroke();
    doc.text(slot.slot, startX + 2, currentY + 3, { width: colWidth - 4, height: 20 });

    // Classes for each day
    days.forEach((day, dayIdx) => {
      const scheduleItem = timetable.schedule.find(s => s.day === day);
      const slot = scheduleItem?.slots?.[slotIdx];

      doc.rect(startX + colWidth * (dayIdx + 1), currentY, colWidth, 25).stroke();

      if (slot?.subject) {
        doc.fontSize(6).text("[Subject]", startX + colWidth * (dayIdx + 1) + 2, currentY + 3, {
          width: colWidth - 4,
          height: 20
        });
      }
    });

    currentY += 25;
  });

  doc.moveDown(2);
};

/**
 * Add detailed class information
 */
const addClassDetails = (doc, timetable, subjects) => {
  doc.addPage();
  doc.fontSize(11).font("Helvetica-Bold").text("Class Details", 30, doc.y);
  doc.moveDown(0.3);

  const classDetails = new Map();

  // Collect class information
  timetable.schedule.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.subject) {
        const key = slot.subject.toString();
        if (!classDetails.has(key)) {
          const subject = subjects.find(s => s._id.toString() === key);
          classDetails.set(key, {
            subject,
            sessions: []
          });
        }
        classDetails.get(key).sessions.push({
          day: day.day,
          time: slot.timeSlot,
          faculty: slot.faculty,
          classroom: slot.classroom
        });
      }
    });
  });

  // Display each subject
  let index = 1;
  doc.fontSize(9).font("Helvetica");
  classDetails.forEach((details, subjectId) => {
    doc.text(
      `${index}. ${details.subject?.name || "Unknown"} (${details.subject?.code || ""})`,
      30,
      doc.y
    );
    doc.fontSize(8);
    doc.text(`   Type: ${details.subject?.type || "theory"}`, 30);
    doc.text(`   Credits: ${details.subject?.credits || 3}`, 30);
    doc.text(`   Sessions: ${details.sessions.length}`, 30);
    doc.fontSize(9);
    doc.moveDown(0.2);

    index++;
  });

  doc.moveDown(0.5);
};

/**
 * Add faculty assignment details
 */
const addFacultyAssignments = (doc, timetable) => {
  doc.fontSize(11).font("Helvetica-Bold").text("Faculty Assignments", 30, doc.y);
  doc.moveDown(0.3);

  const facultyLoad = new Map();

  timetable.schedule.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.faculty) {
        const key = slot.faculty.toString();
        if (!facultyLoad.has(key)) {
          facultyLoad.set(key, { sessions: 0, slots: [] });
        }
        const data = facultyLoad.get(key);
        data.sessions++;
        data.slots.push(`${day.day} at ${slot.timeSlot}`);
      }
    });
  });

  doc.fontSize(9).font("Helvetica");
  let index = 1;
  facultyLoad.forEach((load, facultyId) => {
    doc.text(`${index}. Faculty ID: ${facultyId}`, 30, doc.y);
    doc.fontSize(8).text(`   Total Classes: ${load.sessions}`, 30);
    doc.fontSize(9);
    doc.moveDown(0.2);
    index++;
  });

  doc.moveDown(0.5);
};

/**
 * Add classroom assignment details
 */
const addClassroomAssignments = (doc, timetable) => {
  doc.fontSize(11).font("Helvetica-Bold").text("Classroom Assignments", 30, doc.y);
  doc.moveDown(0.3);

  const roomUsage = new Map();

  timetable.schedule.forEach(day => {
    day.slots.forEach(slot => {
      if (slot.classroom) {
        const key = slot.classroom.toString();
        if (!roomUsage.has(key)) {
          roomUsage.set(key, { classes: 0 });
        }
        roomUsage.get(key).classes++;
      }
    });
  });

  doc.fontSize(9).font("Helvetica");
  let index = 1;
  roomUsage.forEach((usage, roomId) => {
    doc.text(`${index}. Classroom ID: ${roomId}`, 30, doc.y);
    doc.fontSize(8).text(`   Total Classes: ${usage.classes}`, 30);
    doc.fontSize(9);
    doc.moveDown(0.2);
    index++;
  });

  doc.moveDown(0.5);
};

/**
 * Add constraints and conflicts summary
 */
const addConstraintsSummary = (doc, timetable) => {
  if (!timetable.constraints || (!timetable.constraints.hardConstraints?.length && !timetable.constraints.softConstraints?.length)) {
    return;
  }

  doc.fontSize(11).font("Helvetica-Bold").text("Constraints & Compliance", 30, doc.y);
  doc.moveDown(0.2);

  if (timetable.constraints.hardConstraints?.length > 0) {
    doc.fontSize(9).font("Helvetica-Bold").text("Hard Constraints (Must satisfy):", 30);
    doc.font("Helvetica");
    timetable.constraints.hardConstraints.forEach(constraint => {
      doc.fontSize(8).text(`• ${constraint}`, 40);
    });
  }

  if (timetable.constraints.softConstraints?.length > 0) {
    doc.moveDown(0.2);
    doc.fontSize(9).font("Helvetica-Bold").text("Soft Constraints (Preferred):", 30);
    doc.font("Helvetica");
    timetable.constraints.softConstraints.forEach(constraint => {
      doc.fontSize(8).text(`• ${constraint}`, 40);
    });
  }

  doc.moveDown(0.5);
};

/**
 * Add NEP 2020 compliance section
 */
const addNEP2020Section = (doc, timetable) => {
  doc.fontSize(14).font("Helvetica-Bold").text("NEP 2020 Compliance Details", 30, doc.y);
  doc.moveDown(0.3);

  if (timetable.deliveryConfig?.mode !== "offline") {
    doc.fontSize(10).font("Helvetica-Bold").text("Delivery Mode:", 30);
    doc.fontSize(9).font("Helvetica").text(
      `Mode: ${timetable.deliveryConfig?.mode || "offline"}`,
      30
    );
    if (timetable.deliveryConfig?.blendedRatio) {
      doc.text(
        `Blended Ratio - Online: ${timetable.deliveryConfig.blendedRatio.online}%, Offline: ${timetable.deliveryConfig.blendedRatio.offline}%`,
        30
      );
    }
    doc.moveDown(0.3);
  }

  if (timetable.experientialLearningSchedule?.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").text("Experiential Learning Schedule:", 30);
    doc.font("Helvetica").fontSize(8);
    timetable.experientialLearningSchedule.forEach(exp => {
      doc.text(
        `Week ${exp.week}: ${exp.activityType} - ${exp.description} (${exp.hours} hours)`,
        40
      );
    });
    doc.moveDown(0.3);
  }

  if (timetable.skillAssessmentPlan?.length > 0) {
    doc.fontSize(10).font("Helvetica-Bold").text("Skill Assessment Plan:", 30);
    doc.font("Helvetica").fontSize(8);
    timetable.skillAssessmentPlan.forEach(skill => {
      doc.text(
        `${skill.skillName} - Week ${skill.assessmentWeek} - Methods: ${skill.methods?.join(", ")}`,
        40
      );
    });
    doc.moveDown(0.3);
  }

  if (timetable.isNEP2020Compliant !== undefined) {
    doc.fontSize(10).font("Helvetica-Bold").text("Compliance Status:", 30);
    doc.font("Helvetica").fontSize(9);
    doc.text(
      `Status: ${timetable.isNEP2020Compliant ? "✓ Compliant" : "✗ Non-compliant"}`,
      30
    );
  }
};

/**
 * Add footer with timestamps and metadata
 */
const addFooter = (doc, timetable) => {
  const pageCount = doc.bufferedPageRange().count;
  
  for (let i = 1; i <= pageCount; i++) {
    doc.switchToPage(i - 1);
    
    doc.fontSize(8).font("Helvetica");
    doc.text(
      `Generated on ${new Date().toLocaleString()} | Timetable ID: ${timetable._id}`,
      30,
      doc.page.height - 30,
      { align: "center" }
    );
    
    doc.text(`Page ${i} of ${pageCount}`, doc.page.width - 60, doc.page.height - 30);
  }
};

/**
 * Export timetable as multiple formats
 */
export const exportTimetableMultipleFormats = async (timetable, department, subjects, outputDir) => {
  const timestamp = Date.now();
  const basename = `timetable_${department.code}_sem${timetable.semester}_${timestamp}`;

  const results = {
    pdf: null,
    json: null,
    csv: null
  };

  try {
    // PDF Export
    const pdfPath = path.join(outputDir, `${basename}.pdf`);
    results.pdf = await generateTimetablePDF(timetable, department, subjects, pdfPath);

    // JSON Export
    const jsonPath = path.join(outputDir, `${basename}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ timetable, department, subjects }, null, 2));
    results.json = jsonPath;

    // CSV Export
    const csvPath = path.join(outputDir, `${basename}.csv`);
    const csvContent = generateCSVContent(timetable, department);
    fs.writeFileSync(csvPath, csvContent);
    results.csv = csvPath;

    return results;
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
};

/**
 * Generate CSV content for timetable
 */
const generateCSVContent = (timetable, department) => {
  let csv = "Time,";
  
  const days = department.workingDays || [];
  csv += days.join(",") + "\n";

  const timeSlots = department.timeSlots || [];
  timeSlots.forEach(slot => {
    csv += slot.slot + ",";
    days.forEach(day => {
      const daySchedule = timetable.schedule.find(s => s.day === day);
      const slotData = daySchedule?.slots?.find(sl => sl.timeSlot === slot.slot);
      csv += (slotData?.subject ? "Class" : "") + ",";
    });
    csv += "\n";
  });

  return csv;
};

export default {
  generateTimetablePDF,
  exportTimetableMultipleFormats
};
