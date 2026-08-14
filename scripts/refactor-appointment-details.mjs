import fs from "node:fs";

const file = "apps/web/src/modules/schedule/components/AppointmentDetailsView.tsx";
let source = fs.readFileSync(file, "utf8");

source = source.replace('import { useMemo, useState, useEffect, type ReactNode } from "react";', 'import { useMemo, useState, useEffect } from "react";');
source = source.replace('import { useCurrentStaff, useStaffByTeam } from "@/hooks/useStaff";', 'import { useCurrentStaff } from "@/hooks/useStaff";');

const importAnchor = 'import { ReviewRequestPreviewModal } from "./ReviewRequestPreviewModal";';
if (!source.includes(importAnchor)) throw new Error("Appointment details import anchor missing");
source = source.replace(
  importAnchor,
  `${importAnchor}\nimport { AppointmentBillingSummary } from "./AppointmentBillingSummary";\nimport { AppointmentManualTimeEditor } from "./AppointmentManualTimeEditor";\nimport { AppointmentNotesSections } from "./AppointmentNotesSections";\nimport { Dot, InfoCell, TeamWithMembers, getAppointmentStatusConfig } from "./AppointmentDetailsPrimitives";\nimport type { AppointmentDetailsAppointment, JobNote } from "../types/appointmentDetails";`,
);

const definitionsStart = source.indexOf("type Appointment = {");
const componentStart = source.indexOf("export function AppointmentDetailsView", definitionsStart);
if (definitionsStart < 0 || componentStart < 0) throw new Error("Appointment details local definitions not found");
source = source.slice(0, definitionsStart) + source.slice(componentStart);
source = source.replace("  appointment: Appointment;", "  appointment: AppointmentDetailsAppointment;");
source = source.replace("  const statusConfig = getStatusConfig(appointment.status);", "  const statusConfig = getAppointmentStatusConfig(appointment.status);");

const notesStart = source.indexOf("          {/* Job Notes */}");
const gpsStart = source.indexOf("          {/* GPS Status Tracker with Permissions */}", notesStart);
if (notesStart < 0 || gpsStart < 0) throw new Error("Appointment notes block not found");
const notesReplacement = `          <AppointmentNotesSections\n            notes={notes}\n            additionalNotes={additionalNotes}\n            feedbackList={feedbackList}\n            jobNotesExpanded={jobNotesExpanded}\n            additionalNotesExpanded={additionalNotesExpanded}\n            feedbackExpanded={feedbackExpanded}\n            onToggleJobNotes={() => setJobNotesExpanded((value) => !value)}\n            onToggleAdditionalNotes={() => setAdditionalNotesExpanded((value) => !value)}\n            onToggleFeedback={() => setFeedbackExpanded((value) => !value)}\n            onAddJobNote={() => setAddNoteOpen(true)}\n            onAddAdditionalNote={() => setAddAdditionalNoteOpen(true)}\n            onAddFeedback={() => setAddFeedbackOpen(true)}\n            onDeleteJobNote={handleDeleteNote}\n            onDeleteAdditionalNote={handleDeleteAdditionalNote}\n            onDeleteFeedback={handleDeleteFeedback}\n          />\n\n          <Separator />\n\n`;
source = source.slice(0, notesStart) + notesReplacement + source.slice(gpsStart);

const manualStart = source.indexOf("          {canManuallyEditTime && (");
const pricingComment = "          {/* Pricing + statuses */}";
const pricingStart = source.indexOf(pricingComment, manualStart);
if (manualStart < 0 || pricingStart < 0) throw new Error("Appointment manual time block not found");
const manualReplacement = `          {canManuallyEditTime && (\n            <>\n              <Separator />\n              <AppointmentManualTimeEditor\n                cleaningTimeTotal={cleaningTimeTotal}\n                timeValues={timeValues}\n                editingTime={editingTime}\n                tempTimeValue={tempTimeValue}\n                onTempTimeChange={setTempTimeValue}\n                onSave={handleSaveTime}\n                onCancel={handleCancelEditTime}\n                onEdit={handleEditTime}\n                onClear={handleClearTime}\n              />\n            </>\n          )}\n\n          <Separator />\n\n`;
source = source.slice(0, manualStart) + manualReplacement + source.slice(pricingStart);

const billingStart = source.indexOf(pricingComment);
const mainEnd = source.indexOf("        </main>", billingStart);
if (billingStart < 0 || mainEnd < 0) throw new Error("Appointment billing block not found");
const billingReplacement = `          {/* Pricing + statuses */}\n          <AppointmentBillingSummary amount={appointment.amount} onSendInvoice={handleSendInvoice} />\n`;
source = source.slice(0, billingStart) + billingReplacement + source.slice(mainEnd);

if (source.includes("function InfoCell") || source.includes("const renderJob") || source.includes("getStatusConfig(")) {
  throw new Error("Appointment details extracted definitions remain");
}

fs.writeFileSync(file, source);
