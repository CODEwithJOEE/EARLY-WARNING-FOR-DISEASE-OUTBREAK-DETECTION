import type { Disease } from "./types";

// Generic public-health suggestions shown with an alert.
// These are decision-support text only and must be reviewed and edited by the RHU.
export const RECOMMENDATIONS: Record<Disease, string[]> = {
  diarrhea: [
    "Remind households to boil or chlorinate drinking water and to wash hands with soap.",
    "Check stock of oral rehydration salts (ORS) and zinc.",
    "Inspect water sources, especially after heavy rainfall or flooding.",
    "Share food-hygiene reminders through barangay health workers.",
  ],
  cough: [
    "Promote cough etiquette and mask use in crowded places.",
    "Check stock of relevant medicines and screening supplies.",
    "Prioritise children, older adults and people with chronic illness for screening and referral.",
    "Ask barangay health workers to look for people with persistent cough.",
  ],
  fever: [
    "Advise households to remove stagnant water where mosquitoes breed.",
    "Prepare triage capacity for more consultations.",
    "Remind the community to consult early for fever that persists.",
    "Report to the municipal or provincial surveillance unit if cases cluster in one area.",
  ],
};
