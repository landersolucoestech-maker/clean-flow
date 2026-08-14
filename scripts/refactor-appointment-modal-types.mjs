import fs from "node:fs";

const file = "apps/web/src/modules/schedule/components/AppointmentModal.tsx";
let source = fs.readFileSync(file, "utf8");

const anchor = 'import { FREQUENCY_OPTIONS, SERVICE_TYPES } from "@/lib/serviceEnums";';
if (!source.includes(anchor)) throw new Error('AppointmentModal import anchor missing');
source = source.replace(
  anchor,
  `${anchor}\nimport type { AppointmentModalProps, EditJobData } from "../types/appointmentModal";\nexport type { EditJobData } from "../types/appointmentModal";`,
);

const typesStart = source.indexOf('interface PrefilledData {');
const typesEnd = source.indexOf('// staffMembers is now fetched from the database via useCleanersAndDrivers hook', typesStart);
if (typesStart < 0 || typesEnd < 0) throw new Error('AppointmentModal inline type block missing');
source = source.slice(0, typesStart) + 'const TEAM_OPTIONS = ["1", "2", "3", "4", "5", "6"];\n\n' + source.slice(typesEnd);

if (source.includes('interface PrefilledData')) throw new Error('PrefilledData remains inline');
if (source.includes('interface AppointmentModalProps')) throw new Error('AppointmentModalProps remains inline');
if (/export\s+interface\s+EditJobData/.test(source)) throw new Error('EditJobData remains inline');
if (!source.includes('AppointmentModalProps')) throw new Error('AppointmentModalProps import missing');
if (!source.includes('const TEAM_OPTIONS')) throw new Error('TEAM_OPTIONS was not preserved');

fs.writeFileSync(file, source);
