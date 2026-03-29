export const sfg20Mapping: Record<string, { title: string; freq: string; statutory: boolean; standard: string }[]> = {
  'Fire Alarm System': [
    { title: 'Weekly Test Log Review', freq: 'Monthly', statutory: true, standard: 'BS 5839-1' },
    { title: 'Full System Inspection', freq: 'Quarterly', statutory: true, standard: 'BS 5839-1' },
    { title: 'Annual Service', freq: 'Annual', statutory: true, standard: 'BS 5839-1' }
  ],
  'Emergency Lighting': [
    { title: 'Monthly Functional Test', freq: 'Monthly', statutory: true, standard: 'BS 5266-1' },
    { title: 'Full Duration Test', freq: 'Annual', statutory: true, standard: 'BS 5266-1' }
  ],
  'Commercial Boiler': [
    { title: 'Annual Gas Safety Inspection', freq: 'Annual', statutory: true, standard: 'Gas Safety Regs 1998' },
    { title: 'Interim Service', freq: '6-Monthly', statutory: false, standard: 'SFG20' }
  ],
  'HVAC / Air Conditioning': [
    { title: 'Filter Change & Clean', freq: 'Quarterly', statutory: false, standard: 'SFG20' },
    { title: 'Full Service', freq: '6-Monthly', statutory: false, standard: 'SFG20 / CIBSE' }
  ],
  'Electrical Distribution': [
    { title: 'EICR Review (check interval)', freq: 'Annual', statutory: true, standard: 'BS 7671' },
    { title: 'PAT Testing Review', freq: 'Annual', statutory: false, standard: 'IET CoP' }
  ],
  'Water System': [
    { title: 'Temperature Monitoring', freq: 'Monthly', statutory: true, standard: 'L8 ACoP' },
    { title: 'Full Outlet Monitoring', freq: 'Quarterly', statutory: true, standard: 'L8 ACoP' },
    { title: 'Risk Assessment Review', freq: 'Annual', statutory: true, standard: 'L8 ACoP' }
  ],
  'Passenger Lift': [
    { title: 'LOLER Thorough Examination', freq: '6-Monthly', statutory: true, standard: 'LOLER 1998' }
  ],
  'Dry Riser': [
    { title: 'Visual Inspection', freq: '6-Monthly', statutory: true, standard: 'BS 9990' },
    { title: 'Pressure Test', freq: 'Annual', statutory: true, standard: 'BS 9990' }
  ],
  'Fire Extinguisher': [
    { title: 'Annual Service', freq: 'Annual', statutory: true, standard: 'BS 5306-3' }
  ]
};
