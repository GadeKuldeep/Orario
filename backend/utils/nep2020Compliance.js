/**
 * NEP 2020 Compliance Utility
 * Validates and ensures timetables meet National Education Policy 2020 requirements
 */

/**
 * Check if a timetable is NEP 2020 compliant
 */
export const validateNEP2020Compliance = async (timetable, subjects, department) => {
  const checkpoints = [];
  let isCompliant = true;

  // Checkpoint 1: Flexible Tiering Support
  checkpoints.push({
    checkpoint: "Flexible Timing Support",
    status: department?.flexibleTiming?.enabled ? "satisfied" : "not-applicable",
    remarks: department?.flexibleTiming?.enabled 
      ? "Department supports flexible timing options"
      : "Department uses standard fixed timing"
  });

  // Checkpoint 2: Experiential Learning Integration
  const hasExperientialCourses = subjects.some(s => s.isExperientialLearning);
  checkpoints.push({
    checkpoint: "Experiential Learning Integration",
    status: hasExperientialCourses ? "satisfied" : "pending",
    remarks: hasExperientialCourses
      ? `${subjects.filter(s => s.isExperientialLearning).length} experiential learning courses included`
      : "No experiential learning courses found - consider adding internship/project-based courses"
  });

  // Checkpoint 3: Multi-disciplinary Course Support
  const multiDisciplinaryCourses = subjects.filter(s => s.sharedDepartments?.length > 0);
  checkpoints.push({
    checkpoint: "Multi-disciplinary Course Support",
    status: multiDisciplinaryCourses.length > 0 ? "satisfied" : "pending",
    remarks: multiDisciplinaryCourses.length > 0
      ? `${multiDisciplinaryCourses.length} multi-department courses offered`
      : "Consider offering multi-disciplinary courses"
  });

  // Checkpoint 4: Flexible Delivery Modes
  const blendedOrOnlineCourses = subjects.filter(s => s.deliveryMode !== "offline");
  checkpoints.push({
    checkpoint: "Flexible Delivery Modes (Online/Blended)",
    status: timetable?.deliveryConfig?.mode !== "offline" ? "satisfied" : "pending",
    remarks: timetable?.deliveryConfig?.mode !== "offline"
      ? `Timetable supports ${timetable?.deliveryConfig?.mode} delivery mode`
      : "Timetable is offline only - consider online/blended options"
  });

  // Checkpoint 5: Skill-based Learning Components
  const skillBasedCourses = subjects.filter(s => s.skillComponents?.length > 0);
  checkpoints.push({
    checkpoint: "Skill-based Learning Integration",
    status: skillBasedCourses.length > 0 ? "satisfied" : "pending",
    remarks: skillBasedCourses.length > 0
      ? `${skillBasedCourses.length} courses with skill components`
      : "Consider adding skill-based learning components"
  });

  // Checkpoint 6: 4Cs Integration (Critical Thinking, Communication, Collaboration, Creativity)
  const fourCsCourses = subjects.filter(s => 
    s.learningOutcomes?.some(lo => 
      ["critical-thinking", "communication", "collaboration", "creativity"].includes(lo.alignedWith)
    )
  );
  checkpoints.push({
    checkpoint: "4Cs Learning Outcomes (Critical Thinking, Communication, Collaboration, Creativity)",
    status: fourCsCourses.length > 0 ? "satisfied" : "pending",
    remarks: fourCsCourses.length > 0
      ? `${fourCsCourses.length} courses aligned with 4Cs framework`
      : "Define learning outcomes aligned with 4Cs framework"
  });

  // Checkpoint 7: Assessment Policy Compliance
  const assessmentCompliant = department?.assessmentPolicy?.continuousEvaluation && 
                              department?.assessmentPolicy?.projectBasedEvaluation;
  checkpoints.push({
    checkpoint: "Progressive Assessment Methods",
    status: assessmentCompliant ? "satisfied" : "pending",
    remarks: assessmentCompliant
      ? "Department supports continuous and project-based evaluation"
      : "Implement continuous evaluation and project-based assessment methods"
  });

  // Checkpoint 8: Industry Collaboration
  const hasIndustryPartners = department?.experientialLearningSupport?.hasIndustryPartnership || 
                              department?.experientialLearningSupport?.industryPartners?.length > 0;
  checkpoints.push({
    checkpoint: "Industry Collaboration & Partnerships",
    status: hasIndustryPartners ? "satisfied" : "pending",
    remarks: hasIndustryPartners
      ? `${department?.experientialLearningSupport?.industryPartners?.length || 1} industry partner(s) engaged`
      : "Establish industry partnerships for experiential learning"
  });

  // Checkpoint 9: Online Infrastructure
  const onlineInfrastructure = department?.onlineCapability?.enabled && 
                               department?.onlineCapability?.platforms?.length > 0;
  checkpoints.push({
    checkpoint: "Online Learning Infrastructure",
    status: onlineInfrastructure ? "satisfied" : "pending",
    remarks: onlineInfrastructure
      ? `Online platforms available: ${department?.onlineCapability?.platforms?.join(", ")}`
      : "Set up online learning infrastructure (LMS, video conferencing platforms)"
  });

  // Checkpoint 10: Cross-institutional Offerings
  const hasCrossInstitutional = timetable?.crossInstitutionalParticipants?.length > 0;
  checkpoints.push({
    checkpoint: "Cross-institutional Course Offerings (Optional)",
    status: hasCrossInstitutional ? "satisfied" : "not-applicable",
    remarks: hasCrossInstitutional
      ? `Partnership with ${timetable?.crossInstitutionalParticipants?.length} institution(s)`
      : "Cross-institutional offerings are optional"
  });

  // Calculate overall compliance status
  const satisfiedCount = checkpoints.filter(cp => cp.status === "satisfied").length;
  const applicableCount = checkpoints.filter(cp => cp.status !== "not-applicable").length;
  const compliancePercentage = Math.round((satisfiedCount / applicableCount) * 100);

  // Mark as compliant if 80% or more checkpoints are satisfied
  isCompliant = compliancePercentage >= 80;

  return {
    isCompliant,
    compliancePercentage,
    checkpoints,
    summary: {
      satisfied: satisfiedCount,
      pending: checkpoints.filter(cp => cp.status === "pending").length,
      notApplicable: checkpoints.filter(cp => cp.status === "not-applicable").length,
      totalApplicable: applicableCount
    },
    recommendations: generateRecommendations(checkpoints)
  };
};

/**
 * Generate improvement recommendations
 */
const generateRecommendations = (checkpoints) => {
  const recommendations = [];

  checkpoints.forEach(cp => {
    if (cp.status === "pending") {
      recommendations.push({
        priority: "high",
        checkpoint: cp.checkpoint,
        suggestion: cp.remarks,
        action: getActionForCheckpoint(cp.checkpoint)
      });
    }
  });

  return recommendations.sort((a, b) => {
    const priorityMap = { critical: 3, high: 2, medium: 1 };
    return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
  });
};

/**
 * Get recommended action for each checkpoint
 */
const getActionForCheckpoint = (checkpoint) => {
  const actions = {
    "Flexible Timing Support": "Enable flexible timing in department settings: Allow variable slot durations (50-90 mins) and compressed semesters",
    "Experiential Learning Integration": "Add internship, industry project, or field-work courses to curriculum",
    "Multi-disciplinary Course Support": "Share courses across departments to provide interdisciplinary learning opportunities",
    "Flexible Delivery Modes (Online/Blended)": "Configure online/blended delivery in timetable settings and update course materials for online access",
    "Skill-based Learning Integration": "Define skill components for each course with assessment methods and weightage",
    "4Cs Learning Outcomes (Critical Thinking, Communication, Collaboration, Creativity)": "Map course learning outcomes to 4Cs framework in subject definitions",
    "Progressive Assessment Methods": "Enable continuous evaluation and project-based assessment in department assessment policy",
    "Industry Collaboration & Partnerships": "Establish partnerships with companies/organizations for internships and live projects",
    "Online Learning Infrastructure": "Set up LMS and video conferencing platforms (Zoom, Teams, Google Meet)",
    "Cross-institutional Course Offerings (Optional)": "Collaborate with other institutions for specialized courses"
  };

  return actions[checkpoint] || "Review NEP 2020 guidelines for this requirement";
};

/**
 * Calculate NEP 2020 compliance metrics
 */
export const calculateComplianceMetrics = (timetable, directory) => {
  return {
    flexibilityIndex: calculateFlexibilityIndex(timetable),
    experientialLearningIndex: calculateExperientialIndex(timetable),
    skillDevelopmentIndex: calculateSkillIndex(timetable),
    inclusivityIndex: calculateInclusivityIndex(timetable)
  };
};

const calculateFlexibilityIndex = (timetable) => {
  // 0-100: Measure flexibility in timing, delivery modes, course options
  const hasFlexibleTiming = timetable?.deliveryConfig?.mode !== "offline";
  const hasMultipleDeliveryDates = timetable?.experientialLearningSchedule?.length > 0;
  const score = (hasFlexibleTiming ? 50 : 0) + (hasMultipleDeliveryDates ? 50 : 0);
  return score;
};

const calculateExperientialIndex = (timetable) => {
  // 0-100: Measure experiential learning components
  const experientialHours = timetable?.experientialLearningSchedule
    ?.reduce((sum, exp) => sum + (exp.hours || 0), 0) || 0;
  return Math.min(100, Math.round((experientialHours / 200) * 100));
};

const calculateSkillIndex = (timetable) => {
  // 0-100: Measure skill-based learning focus
  const skillCount = timetable?.skillAssessmentPlan?.length || 0;
  return Math.min(100, Math.round((skillCount / 10) * 100));
};

const calculateInclusivityIndex = (timetable) => {
  // 0-100: Measure accessibility and inclusivity
  const hasOnlineOption = timetable?.deliveryConfig?.mode !== "offline";
  const hasRecording = timetable?.deliveryConfig?.onlineClasses?.some(c => c.recordingAvailable);
  const score = (hasOnlineOption ? 50 : 0) + (hasRecording ? 50 : 0);
  return score;
};

export default {
  validateNEP2020Compliance,
  calculateComplianceMetrics
};
