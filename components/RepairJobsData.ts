// RepairJobsData.ts
// ═══════════════════════════════════════════════════════════════
// Mock repair job data for HomeTabAgent Active Repairs section
// Updated Session 16: Added jobStatus to all jobs, added ACTIVE_REPAIR_JOBS export
// ═══════════════════════════════════════════════════════════════

import type { RepairJob, JobStatus } from './RepairJobDetails';

/**
 * Full mock repair jobs with lifecycle status tracking.
 *
 * @backend Replace with: const { data: repairJobs } = useRepairJobs();
 *   → SELECT * FROM repair_jobs
 *     WHERE agent_id = auth.uid()
 *     ORDER BY created_at DESC
 */
export const MOCK_REPAIR_JOBS: RepairJob[] = [
  {
    id: '1',
    title: 'Fix Leaking Kitchen Faucet',
    category: 'Plumbing',
    dueDate: 'Mar 2',
    isUrgent: true,
    budgetRange: '$150 \u2013 $400',
    address: '4521 Elm Street, Denver CO 80220',
    description: 'Kitchen faucet has been dripping for a week. Possible cartridge replacement needed. Standard Moen single-handle fixture.',
    photoPlaceholder: '📸 3 photos attached',
    jobStatus: 'open',
    bids: [
      { id: 'b1', name: 'Brian Cooper', company: 'ProBuild Contractors', trade: 'General Contractor', isLicensed: true, avatarColor: '#7BA3C9', rating: 5.0, responseTime: '2h ago', price: '$280', message: 'I can get this done tomorrow morning. Faucet cartridge replacement is straightforward — I stock Moen parts.', tags: ['Licensed & Insured', 'Fast Response'], status: 'pending' },
      { id: 'b2', name: 'Tony Ruiz', company: 'Front Range Plumbing', trade: 'Plumber', isLicensed: true, hasUnreadMessages: true, avatarColor: '#C9A87B', rating: 4.8, responseTime: '4h ago', price: '$195', message: 'Standard cartridge swap. I\'ll include a 6-month labor warranty. Available this Thursday.', tags: ['Licensed & Insured', 'Warranty Offered'], status: 'pending' },
      { id: 'b3', name: 'Derek Washington', company: 'Volt Electric Co', trade: 'Handyman', isLicensed: false, avatarColor: '#8BA8C9', rating: 4.6, responseTime: '6h ago', price: '$150', message: 'Can fix this Saturday morning. Have done dozens of faucet repairs.', tags: ['Fast Response'], status: 'pending' },
    ],
  },
  {
    id: '2',
    title: 'Garage Door Won\u2019t Open',
    category: 'Garage Door',
    dueDate: 'Mar 5',
    isUrgent: false,
    budgetRange: '$200 \u2013 $600',
    address: '782 Maple Drive, Lakewood CO 80226',
    description: 'Garage door opener not responding. Remote and wall switch both dead. Model: LiftMaster 8500.',
    jobStatus: 'awarded',
    awardedContractorName: 'Mike Patterson',
    awardedAmount: '$425',
    awardedDate: 'Feb 24',
    bids: [
      { id: 'b4', name: 'Mike Patterson', company: 'Denver Garage Pros', trade: 'Garage Door Tech', isLicensed: true, avatarColor: '#C5B5A8', rating: 4.9, responseTime: '1h ago', price: '$425', message: 'Sounds like a logic board issue. I can diagnose and repair same-day. LiftMaster certified.', tags: ['Licensed & Insured', 'Same-Day Service'], status: 'accepted' },
      { id: 'b5', name: 'James Foster', company: 'Summit Roofing & Repair', trade: 'General Contractor', isLicensed: true, avatarColor: '#D4C5A8', rating: 4.7, responseTime: '5h ago', price: '$550', message: 'Happy to take a look. Might need a full opener replacement.', tags: ['Licensed & Insured'], status: 'rejected' },
    ],
  },
  {
    id: '3',
    title: 'Patch and Paint Bedroom Walls',
    category: 'Painting',
    dueDate: 'Mar 8',
    isUrgent: false,
    budgetRange: '$300 \u2013 $500',
    address: '1150 Pine Court, Aurora CO 80012',
    description: 'Multiple nail holes and one 4-inch drywall patch in master bedroom. Match existing eggshell finish.',
    photoPlaceholder: '📸 5 photos attached',
    jobStatus: 'in_progress',
    awardedContractorName: 'Sandra Kim',
    awardedAmount: '$380',
    awardedDate: 'Feb 22',
    bids: [
      { id: 'b6', name: 'Sandra Kim', company: 'Fresh Coat Denver', trade: 'Painter', isLicensed: true, avatarColor: '#D4A8A8', rating: 4.9, responseTime: '3h ago', price: '$380', message: 'I can match the color with a quick sample patch. Two coats included. Will protect floors and trim.', tags: ['Licensed & Insured', 'Clean Work'], status: 'accepted' },
    ],
  },
  {
    id: '4',
    title: 'HVAC Inspection Pre-Close',
    category: 'HVAC',
    dueDate: 'Mar 1',
    isUrgent: true,
    budgetRange: '$100 \u2013 $250',
    address: '331 Oak Boulevard, Denver CO 80209',
    description: 'Buyer requested HVAC inspection before closing. Need full system check — furnace, AC unit, ductwork.',
    jobStatus: 'open',
    bids: [
      { id: 'b7', name: 'Tyler Reed', company: 'Alpine HVAC Solutions', trade: 'HVAC Technician', isLicensed: true, avatarColor: '#B5C5D4', rating: 4.8, responseTime: '2h ago', price: '$185', message: 'Full HVAC inspection with written report. I can come tomorrow afternoon.', tags: ['Licensed & Insured', 'Fast Response'], status: 'pending' },
    ],
  },
  {
    id: '5',
    title: 'Replace Front Porch Railing',
    category: 'Carpentry',
    dueDate: 'Mar 12',
    isUrgent: false,
    budgetRange: '$400 \u2013 $800',
    address: '205 Birch Lane, Centennial CO 80112',
    description: 'Front porch wood railing is rotted at the base. Needs full replacement — approximately 12 linear feet.',
    photoPlaceholder: '📸 2 photos attached',
    jobStatus: 'pending_confirmation',
    awardedContractorName: 'Brian Cooper',
    awardedAmount: '$625',
    awardedDate: 'Feb 20',
    bids: [
      { id: 'b8', name: 'Brian Cooper', company: 'ProBuild Contractors', trade: 'General Contractor', isLicensed: true, avatarColor: '#7BA3C9', rating: 5.0, responseTime: '1h ago', price: '$625', message: 'Cedar railing with treated posts. I\'ll pull a permit if needed — usually not required for replacements under 30in.', tags: ['Licensed & Insured', 'Permit-Ready'], status: 'accepted' },
    ],
  },
  {
    id: '6',
    title: 'Landscaping Cleanup Before Listing',
    category: 'Landscaping',
    dueDate: 'Feb 20',
    isUrgent: false,
    budgetRange: '$200 \u2013 $450',
    address: '900 Aspen Way, Littleton CO 80120',
    description: 'Front and backyard cleanup before listing photos. Trim bushes, edge lawn, mulch beds, remove debris.',
    jobStatus: 'completed',
    awardedContractorName: 'Kevin Walsh',
    awardedAmount: '$350',
    awardedDate: 'Feb 15',
    bids: [
      { id: 'b9', name: 'Kevin Walsh', company: 'Walsh Landscaping', trade: 'Landscaper', isLicensed: true, avatarColor: '#B5D4A8', rating: 4.7, responseTime: '4h ago', price: '$350', message: 'Full cleanup with debris haul-away. Can do it this weekend. I\'ll include fresh mulch.', tags: ['Licensed & Insured', 'Competitive Pricing'], status: 'accepted' },
    ],
  },
];

/**
 * Active repair jobs — filters out completed and cancelled statuses.
 * Used by HomeTabAgent Active Repairs section to only show pipeline-relevant jobs.
 *
 * @backend Replace with: useRepairJobs({ status: { notIn: ['completed', 'cancelled'] } })
 */
export const ACTIVE_REPAIR_JOBS = MOCK_REPAIR_JOBS.filter(
  (job) => job.jobStatus !== 'completed' && job.jobStatus !== 'cancelled'
);
