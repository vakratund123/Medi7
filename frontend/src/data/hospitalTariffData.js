/**
 * SAI EMERGENCY & MULTISPECIALITY HOSPITAL
 * KPME REG. NO: BLG03043ALHL3
 * Master Hospital Rate Chart (Valid until 31 March 2027)
 */

export const HOSPITAL_TARIFF = [
  // 1. Consultation & OPD
  {
    code: 'REG',
    name: 'Consulting Fees',
    kannada_name: 'ಸಲಹಾ ಶುಲ್ಕ',
    category: 'Consultation',
    rate: 200,
    unit: 'Per Visit',
    is_ipd: false,
    sr_no: 1,
  },
  {
    code: 'FU',
    name: 'Follow-up Charges (Up to 1 Month)',
    kannada_name: 'ಫಾಲೋ-ಅಪ್ ಶುಲ್ಕ (01 ತಿಂಗಳವರೆಗೆ)',
    category: 'Consultation',
    rate: 100,
    unit: 'Per Visit',
    is_ipd: false,
    sr_no: 2,
  },
  {
    code: 'ECC',
    name: 'Emergency Consultation Charges',
    kannada_name: 'ತುರ್ತು ಸಲಹಾ ಶುಲ್ಕ',
    category: 'Emergency',
    rate: 2000,
    unit: 'Per Assessment',
    is_ipd: false,
    sr_no: null,
  },
  {
    code: 'DOC-PROF',
    name: "Doctor's Professional Charges",
    kannada_name: 'ರೋಗಿಯ ಸ್ಥಿತಿಗೆ ಅನುಗುಣವಾಗಿ ವೈದ್ಯರ ವೃತ್ತಿಪರ ಶುಲ್ಕ',
    category: 'Consultation',
    rate: 500,
    unit: 'As Per Patient Condition',
    is_ipd: false,
    sr_no: 12,
    rate_range: 'Variable / As Per Condition',
  },

  // 2. OPD Procedures & Nursing
  {
    code: 'IC',
    name: 'Injection Charges',
    kannada_name: 'ಇಂಜೆಕ್ಷನ್ ಶುಲ್ಕ',
    category: 'Procedure',
    rate: 100,
    unit: 'Per Injection',
    is_ipd: false,
    sr_no: 3,
  },
  {
    code: 'DREC-MIN',
    name: 'Dressing Charges (Minor)',
    kannada_name: 'ಸಾಮಾನ್ಯ ಡ್ರೆಸಿಂಗ್ ಶುಲ್ಕ',
    category: 'Procedure',
    rate: 300,
    unit: 'Per Dressing',
    is_ipd: false,
    sr_no: 5,
  },
  {
    code: 'DREC-MAJ',
    name: 'Dressing Charges (Major)',
    kannada_name: 'ಗಂಭೀರ ಡ್ರೆಸಿಂಗ್ ಶುಲ್ಕ',
    category: 'Procedure',
    rate: 500,
    unit: 'Per Dressing',
    is_ipd: false,
    sr_no: 5,
    rate_range: '₹500 - ₹800',
  },
  {
    code: 'NEB',
    name: 'Nebuliser Charges',
    kannada_name: 'ನೆಬುಲೈಸರ್',
    category: 'Procedure',
    rate: 100,
    unit: 'Per Session',
    is_ipd: false,
    sr_no: 6,
  },

  // 3. Diagnostics & Imaging
  {
    code: 'GRBS',
    name: 'GRBS Charges (Blood Sugar Test)',
    kannada_name: 'ಜಿಆರ್‌ಬಿಎಸ್ (ರಕ್ತ ಪರೀಕ್ಷೆ) ಶುಲ್ಕ',
    category: 'Diagnostics',
    rate: 50,
    unit: 'Per Test',
    is_ipd: false,
    sr_no: 7,
  },
  {
    code: 'ECG',
    name: 'E.C.G. Test',
    kannada_name: 'ಇ.ಸಿ.ಜಿ.',
    category: 'Diagnostics',
    rate: 300,
    unit: 'Per Test',
    is_ipd: false,
    sr_no: 4,
  },
  {
    code: 'TMT',
    name: 'Treadmill Test (TMT)',
    kannada_name: 'ಟ್ರೆಡ್‌ಮಿಲ್ ಟೆಸ್ಟ್‌',
    category: 'Diagnostics',
    rate: 1000,
    unit: 'Per Test',
    is_ipd: false,
    sr_no: 9,
  },
  {
    code: 'ECH',
    name: '2D ECHO & Color Doppler',
    kannada_name: '2ಡಿ ಎಕೋ ಮತ್ತು ಕಲರ್ ಡಾಪ್ಲರ್',
    category: 'Diagnostics',
    rate: 2200,
    unit: 'Per Scan',
    is_ipd: false,
    sr_no: 10,
  },
  {
    code: 'BUSG',
    name: 'Bedside USG',
    kannada_name: 'ಬೆಡ್‌ಸೈಡ್ ಯುಎಸ್‌ಜಿ',
    category: 'Diagnostics',
    rate: 1800,
    unit: 'Per Scan',
    is_ipd: false,
    sr_no: 11,
  },

  // 4. Day Care & Observation
  {
    code: 'DAC',
    name: 'Day Care (With Treatment)',
    kannada_name: 'ದಿನದ ಆರೈಕೆ (ಚಿಕಿತ್ಸೆಯೊಂದಿಗೆ)',
    category: 'Bed Charges',
    rate: 1200,
    unit: 'Per Day',
    is_ipd: false,
    sr_no: 8,
  },

  // 5. Inpatient (IPD) Bed Charges (Bed + Nursing + MO + Consultant Visit)
  {
    code: 'GW',
    name: 'General Ward (Bed + Nursing + MO + Consultant Visit)',
    kannada_name: 'ಜನರಲ್ ವಾರ್ಡ್ (ಹಾಸಿಗೆ + ನರ್ಸಿಂಗ್ + ಎಂ.ಒ. + ವೈದ್ಯರ ಭೇಟಿ)',
    category: 'Bed Charges',
    rate: 2750,
    unit: 'Per Day',
    is_ipd: true,
    sr_no: 13,
  },
  {
    code: 'SR-DBL',
    name: 'Special Room (Double Occupancy) (Bed + Nursing + MO + Consultant Visit)',
    kannada_name: 'ವಿಶೇಷ ಕೊಠಡಿ (ಎರಡು ಹಾಸಿಗೆಗಳ ಕೊಠಡಿ)',
    category: 'Bed Charges',
    rate: 3500,
    unit: 'Per Day',
    is_ipd: true,
    sr_no: 14,
  },
  {
    code: 'SR-SGL',
    name: 'Special Room (Single Occupancy) (Bed + Nursing + MO + Consultant Visit)',
    kannada_name: 'ವಿಶೇಷ ಕೊಠಡಿ (ಒಂದು ಹಾಸಿಗೆಯ ಕೊಠಡಿ)',
    category: 'Bed Charges',
    rate: 3000,
    unit: 'Per Day',
    is_ipd: true,
    sr_no: 15,
  },
  {
    code: 'ICU',
    name: 'ICU Charges (Bed + Nursing + MO + Consultant Visit)',
    kannada_name: 'ಐಸಿಯು ಶುಲ್ಕ (ಹಾಸಿಗೆ + ನರ್ಸಿಂಗ್ + ಎಂ.ಒ. + ವೈದ್ಯರ ಭೇಟಿ)',
    category: 'Bed Charges',
    rate: 5500,
    unit: 'Per Day',
    is_ipd: true,
    sr_no: 16,
  },

  // 6. IPD Critical Care & Special Services
  {
    code: 'VENT',
    name: 'Ventilator Charges',
    kannada_name: 'ವೆಂಟಿಲೇಟರ್ ಶುಲ್ಕ',
    category: 'Procedure',
    rate: 4000,
    unit: 'Per Day',
    is_ipd: true,
    sr_no: 17,
  },
  {
    code: 'O2',
    name: 'Oxygen Charges',
    kannada_name: 'ಪ್ರತಿ ಗಂಟೆಗೆ ಆಮ್ಲಜನಕ ಶುಲ್ಕ',
    category: 'Procedure',
    rate: 50,
    unit: 'Per Hour',
    is_ipd: true,
    sr_no: 18,
  },
  {
    code: 'CVC',
    name: 'Consultant Visit Charges (Specialist)',
    kannada_name: 'ತಜ್ಞ ವೈದ್ಯರ ಸಲಹಾ ಶುಲ್ಕ',
    category: 'Consultation',
    rate: 500,
    unit: 'Per Visit',
    is_ipd: true,
    sr_no: 19,
  },
  {
    code: 'OT',
    name: 'Operation Theatre Charges',
    kannada_name: 'ಆಪರೇಷನ್ ಥಿಯೇಟರ್ ಶುಲ್ಕ',
    category: 'Procedure',
    rate: 2000,
    unit: 'Per Procedure',
    is_ipd: true,
    sr_no: 20,
    rate_range: '₹2000 - ₹5000',
  },
  {
    code: 'SP',
    name: 'Syringe Pump Charges',
    kannada_name: 'ಸಿರಿಂಜ್ ಪಂಪ್ ಶುಲ್ಕ',
    category: 'Procedure',
    rate: 600,
    unit: 'Per Visit / Day',
    is_ipd: true,
    sr_no: 21,
  },
]

/**
 * Filter hospital tariffs by stay type (OPD vs IPD) or category
 */
export function getTariffs(filterType = 'ALL') {
  if (filterType === 'IPD') {
    return HOSPITAL_TARIFF.filter((t) => t.is_ipd)
  }
  if (filterType === 'OPD') {
    return HOSPITAL_TARIFF.filter((t) => !t.is_ipd)
  }
  return HOSPITAL_TARIFF
}
