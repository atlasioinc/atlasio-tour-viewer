// repairJobsData.ts
// ═══════════════════════════════════════════════════════════════
// Mock Repair Jobs — shared data for HomeTab + RepairJobDetails
// Each job includes full bid details for the detail screen
// ═══════════════════════════════════════════════════════════════

import type { RepairJob } from './RepairJobDetails';

export const MOCK_REPAIR_JOBS: RepairJob[] = [
  {
    id: 'repair-1',
    title: 'Attic Vent Seal + GFCI Install',
    category: 'Electrical',
    dueDate: 'Due Dec 1',
    isUrgent: true,
    budgetRange: '$1,000 - $1,500',
    address: '123 Main St, Denver, CO',
    description:
      "Need to seal attic vent that's allowing cold air in, plus install 2 GFCI outlets in kitchen and bathroom per code requirements.",
    bids: [
      {
        id: 'bid-1',
        name: 'Mike Torres',
        company: 'Torres Electric',
        trade: 'Electrical',
        isLicensed: true,
        hasUnreadMessages: true,
        avatarColor: '#E8D5B7',
        rating: 4.9,
        responseTime: 'Responded in 2 min',
        price: '$1,240',
        message:
          "I can start tomorrow morning. I'll bring the proper GFCI outlets and all materials for the vent seal.",
        tags: ['Insured', '15+ Years'],
      },
      {
        id: 'bid-2',
        name: 'Sarah Chen',
        company: 'Chen Electrical Services',
        trade: 'Electrical',
        isLicensed: true,
        avatarColor: '#A8C5DA',
        rating: 4.8,
        responseTime: 'Responded in 15 min',
        price: '$1,200',
        message:
          'Available this week. Will provide warranty on all electrical work. Can also inspect other outlets if needed.',
        tags: ['Insured', '15+ Years'],
      },
      {
        id: 'bid-3',
        name: 'David Park',
        company: 'Park & Sons Electric',
        trade: 'Electrical',
        isLicensed: true,
        avatarColor: '#B5D4A8',
        rating: 4.7,
        responseTime: 'Responded in 1 hour',
        price: '$1,270',
        message:
          'I can do this job and also check your entire electrical panel to ensure everything is up to code.',
        tags: ['20+ Years'],
      },
      {
        id: 'bid-4',
        name: 'James Wilson',
        company: 'Wilson Home Services',
        trade: 'Electrical',
        isLicensed: false,
        avatarColor: '#D4C5A8',
        rating: 4.6,
        responseTime: 'Responded in 3 hours',
        price: '$1,350',
        message:
          "Quality work guaranteed. I'll also provide documentation for your home inspection records.",
        tags: ['Insured', '12 Years'],
      },
    ],
  },
  {
    id: 'repair-2',
    title: 'Roof Leak Repair',
    category: 'Roofing',
    dueDate: 'Due Dec 15',
    isUrgent: false,
    budgetRange: '$800 - $2,000',
    address: '456 Oak Ave, Denver, CO',
    description:
      'Active leak in master bedroom ceiling during rain. Need inspection and repair of damaged shingles and flashing around chimney.',
    bids: [
      {
        id: 'bid-5',
        name: 'Jake Thompson',
        company: 'Summit Roofing Co',
        trade: 'Roofing',
        isLicensed: true,
        hasUnreadMessages: true,
        avatarColor: '#A8C4B8',
        rating: 4.9,
        responseTime: 'Responded in 5 min',
        price: '$1,450',
        message:
          'I can do a full inspection and repair. Will also check gutters and downspouts for any related issues.',
        tags: ['Insured', '18+ Years'],
      },
      {
        id: 'bid-6',
        name: 'Carlos Mendez',
        company: 'Mendez Roofing & Repair',
        trade: 'Roofing',
        isLicensed: true,
        avatarColor: '#D4B8A8',
        rating: 4.8,
        responseTime: 'Responded in 30 min',
        price: '$1,200',
        message:
          'Experienced with chimney flashing repairs. Can start this week and provide a 2-year warranty.',
        tags: ['Insured', '10+ Years'],
      },
    ],
  },
  {
    id: 'repair-3',
    title: 'Kitchen Faucet + Garbage Disposal',
    category: 'Plumbing',
    dueDate: 'Due Nov 28',
    isUrgent: true,
    budgetRange: '$400 - $700',
    address: '789 Pine Blvd, Denver, CO',
    description:
      'Replace leaking kitchen faucet and install new garbage disposal. Buyer requested before closing.',
    bids: [
      {
        id: 'bid-7',
        name: 'Robert Kim',
        company: 'Kim Plumbing Solutions',
        trade: 'Plumbing',
        isLicensed: true,
        avatarColor: '#B8A8D4',
        rating: 5.0,
        responseTime: 'Responded in 8 min',
        price: '$550',
        message:
          'I have both parts in stock. Can do same-day install if you book today.',
        tags: ['Insured', '22+ Years'],
      },
    ],
  },
];
