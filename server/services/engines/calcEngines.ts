/**
 * Calculators and Converters Engine
 * Handles:
 * - age-calculator
 * - date-calculator
 * - percentage-calculator
 * - unit-converter
 * - gst-tax-calculator
 * - profit-margin-calculator
 * - discount-calculator
 */

/**
 * Age Calculator: Computes exact age, day of birth, total days lived, and next birthday
 */
export function ageCalculator(
  birthDateStr: string,
  targetDateStr?: string
): {
  years: number;
  months: number;
  days: number;
  totalDaysLived: number;
  totalHoursLived: number;
  dayOfWeekBorn: string;
  nextBirthdayInDays: number;
  formattedAge: string;
} {
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) {
    throw new Error(`Invalid birth date format "${birthDateStr}". Please use YYYY-MM-DD.`);
  }

  const target = targetDateStr ? new Date(targetDateStr) : new Date();
  if (isNaN(target.getTime())) {
    throw new Error(`Invalid target date format "${targetDateStr}".`);
  }

  if (birth > target) {
    throw new Error('Birth date cannot be in the future relative to target date.');
  }

  let years = target.getFullYear() - birth.getFullYear();
  let months = target.getMonth() - birth.getMonth();
  let days = target.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    // Days in previous month
    const prevMonthLastDay = new Date(target.getFullYear(), target.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const diffMs = target.getTime() - birth.getTime();
  const totalDaysLived = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalHoursLived = Math.floor(diffMs / (1000 * 60 * 60));

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekBorn = daysOfWeek[birth.getDay()];

  // Next birthday calculation
  let nextBdayYear = target.getFullYear();
  let nextBday = new Date(nextBdayYear, birth.getMonth(), birth.getDate());
  if (nextBday < target) {
    nextBday = new Date(nextBdayYear + 1, birth.getMonth(), birth.getDate());
  }
  const nextDiffMs = nextBday.getTime() - target.getTime();
  const nextBirthdayInDays = Math.ceil(nextDiffMs / (1000 * 60 * 60 * 24));

  return {
    years,
    months,
    days,
    totalDaysLived,
    totalHoursLived,
    dayOfWeekBorn,
    nextBirthdayInDays,
    formattedAge: `${years} Years, ${months} Months, ${days} Days`,
  };
}

/**
 * Date Calculator: Add/subtract days, calculate duration between dates, count workdays
 */
export function dateCalculator(
  mode: 'add_days' | 'difference' | 'workdays',
  options: {
    startDate: string;
    endDate?: string;
    daysToAdd?: number;
    excludeWeekends?: boolean;
  }
): {
  resultDate?: string;
  differenceDays?: number;
  workdaysCount?: number;
  weeksAndDays?: string;
  message: string;
} {
  const start = new Date(options.startDate);
  if (isNaN(start.getTime())) {
    throw new Error(`Invalid start date: "${options.startDate}".`);
  }

  if (mode === 'add_days') {
    const daysToAdd = Number(options.daysToAdd) || 0;
    const res = new Date(start);
    res.setDate(res.getDate() + daysToAdd);
    const dateStr = res.toISOString().split('T')[0];
    return {
      resultDate: dateStr,
      message: `${options.startDate} ${daysToAdd >= 0 ? '+' : ''}${daysToAdd} days = ${dateStr}`,
    };
  }

  const end = options.endDate ? new Date(options.endDate) : new Date();
  if (isNaN(end.getTime())) {
    throw new Error(`Invalid end date: "${options.endDate}".`);
  }

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(diffDays / 7);
  const remainingDays = diffDays % 7;

  // Workdays count (Mon-Fri)
  let workdays = 0;
  const current = new Date(Math.min(start.getTime(), end.getTime()));
  const last = new Date(Math.max(start.getTime(), end.getTime()));

  while (current <= last) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      workdays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return {
    differenceDays: diffDays,
    workdaysCount: workdays,
    weeksAndDays: `${weeks} weeks and ${remainingDays} days`,
    message: `Between ${start.toISOString().split('T')[0]} and ${end.toISOString().split('T')[0]}: ${diffDays} calendar days (${workdays} business workdays).`,
  };
}

/**
 * Percentage Calculator: Solves percentage queries
 */
export function percentageCalculator(
  mode: 'percentage_of' | 'is_what_percent' | 'percent_change',
  val1: number,
  val2: number
): {
  result: number;
  formula: string;
  explanation: string;
} {
  const v1 = Number(val1);
  const v2 = Number(val2);

  if (mode === 'percentage_of') {
    // "What is v1% of v2?"
    const result = (v1 / 100) * v2;
    return {
      result: Number(result.toFixed(4)),
      formula: `(${v1} / 100) * ${v2}`,
      explanation: `${v1}% of ${v2} is ${Number(result.toFixed(2))}`,
    };
  }

  if (mode === 'is_what_percent') {
    // "v1 is what percent of v2?"
    if (v2 === 0) throw new Error('Cannot divide by zero in percentage calculation.');
    const result = (v1 / v2) * 100;
    return {
      result: Number(result.toFixed(4)),
      formula: `(${v1} / ${v2}) * 100`,
      explanation: `${v1} is ${Number(result.toFixed(2))}% of ${v2}`,
    };
  }

  // percent_change: from v1 to v2
  if (v1 === 0) throw new Error('Original value cannot be zero for percent change.');
  const change = v2 - v1;
  const percentChange = (change / v1) * 100;
  const dir = change >= 0 ? 'increase' : 'decrease';

  return {
    result: Number(percentChange.toFixed(4)),
    formula: `((${v2} - ${v1}) / ${v1}) * 100`,
    explanation: `From ${v1} to ${v2} is a ${Math.abs(Number(percentChange.toFixed(2)))}% ${dir}`,
  };
}

/**
 * Unit Converter: Comprehensive unit conversion matrix
 */
export function unitConverter(
  category: 'length' | 'weight' | 'temperature' | 'area' | 'volume' | 'data_storage',
  fromUnit: string,
  toUnit: string,
  value: number
): {
  fromValue: number;
  fromUnit: string;
  toValue: number;
  toUnit: string;
  formula: string;
} {
  const val = Number(value);
  const from = fromUnit.toLowerCase().trim();
  const to = toUnit.toLowerCase().trim();

  // Temperature
  if (category === 'temperature') {
    let celsius = 0;
    if (from === 'c' || from === 'celsius') celsius = val;
    else if (from === 'f' || from === 'fahrenheit') celsius = (val - 32) * (5 / 9);
    else if (from === 'k' || from === 'kelvin') celsius = val - 273.15;
    else throw new Error(`Unsupported temperature unit "${fromUnit}". Use C, F, or K.`);

    let result = 0;
    if (to === 'c' || to === 'celsius') result = celsius;
    else if (to === 'f' || to === 'fahrenheit') result = celsius * (9 / 5) + 32;
    else if (to === 'k' || to === 'kelvin') result = celsius + 273.15;
    else throw new Error(`Unsupported temperature unit "${toUnit}". Use C, F, or K.`);

    return {
      fromValue: val,
      fromUnit,
      toValue: Number(result.toFixed(4)),
      toUnit,
      formula: `${val} ${fromUnit} = ${Number(result.toFixed(2))} ${toUnit}`,
    };
  }

  // Length base: meters
  const lengthToMeters: Record<string, number> = {
    m: 1,
    meter: 1,
    meters: 1,
    km: 1000,
    kilometer: 1000,
    cm: 0.01,
    centimeter: 0.01,
    mm: 0.001,
    millimeter: 0.001,
    mi: 1609.344,
    mile: 1609.344,
    miles: 1609.344,
    yd: 0.9144,
    yard: 0.9144,
    ft: 0.3048,
    foot: 0.3048,
    feet: 0.3048,
    in: 0.0254,
    inch: 0.0254,
    inches: 0.0254,
  };

  // Weight base: grams
  const weightToGrams: Record<string, number> = {
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    kilogram: 1000,
    mg: 0.001,
    milligram: 0.001,
    lb: 453.59237,
    pound: 453.59237,
    pounds: 453.59237,
    oz: 28.349523,
    ounce: 28.349523,
    ton: 1000000,
    tonne: 1000000,
  };

  // Area base: square meters
  const areaToSqMeters: Record<string, number> = {
    sqm: 1,
    sq_m: 1,
    square_meter: 1,
    sqft: 0.092903,
    sq_ft: 0.092903,
    square_foot: 0.092903,
    acre: 4046.856,
    acres: 4046.856,
    hectare: 10000,
    sqkm: 1000000,
  };

  // Volume base: liters
  const volumeToLiters: Record<string, number> = {
    l: 1,
    liter: 1,
    liters: 1,
    ml: 0.001,
    milliliter: 0.001,
    gal: 3.78541,
    gallon: 3.78541,
    cup: 0.236588,
  };

  // Data storage base: Bytes
  const dataToBytes: Record<string, number> = {
    b: 1,
    byte: 1,
    bytes: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
    tb: 1024 * 1024 * 1024 * 1024,
  };

  let matrix: Record<string, number> | null = null;
  if (category === 'length') matrix = lengthToMeters;
  else if (category === 'weight') matrix = weightToGrams;
  else if (category === 'area') matrix = areaToSqMeters;
  else if (category === 'volume') matrix = volumeToLiters;
  else if (category === 'data_storage') matrix = dataToBytes;

  if (!matrix) {
    throw new Error(`Category "${category}" is not supported.`);
  }

  const fromFactor = matrix[from];
  const toFactor = matrix[to];

  if (!fromFactor) throw new Error(`Unsupported unit "${fromUnit}" in category "${category}".`);
  if (!toFactor) throw new Error(`Unsupported unit "${toUnit}" in category "${category}".`);

  const baseVal = val * fromFactor;
  const result = baseVal / toFactor;

  return {
    fromValue: val,
    fromUnit,
    toValue: Number(result.toFixed(6)),
    toUnit,
    formula: `${val} ${fromUnit} = ${Number(result.toFixed(4))} ${toUnit}`,
  };
}

/**
 * GST / VAT Tax Calculator: Computes tax added or extracted
 */
export function gstTaxCalculator(
  amount: number,
  ratePercent: number,
  mode: 'add_tax' | 'remove_tax' = 'add_tax'
): {
  netAmount: number;
  taxRatePercent: number;
  taxAmount: number;
  grossAmount: number;
  mode: 'add_tax' | 'remove_tax';
  breakdown: string;
} {
  const amt = Number(amount);
  const rate = Number(ratePercent);

  if (amt < 0 || rate < 0) {
    throw new Error('Amount and tax rate must be non-negative.');
  }

  if (mode === 'add_tax') {
    const tax = (amt * rate) / 100;
    const gross = amt + tax;
    return {
      netAmount: Number(amt.toFixed(2)),
      taxRatePercent: rate,
      taxAmount: Number(tax.toFixed(2)),
      grossAmount: Number(gross.toFixed(2)),
      mode,
      breakdown: `Net: ${amt.toFixed(2)} + ${rate}% Tax (${tax.toFixed(2)}) = Gross: ${gross.toFixed(2)}`,
    };
  }

  // remove_tax: gross given, extract net & tax
  const net = amt / (1 + rate / 100);
  const tax = amt - net;
  return {
    netAmount: Number(net.toFixed(2)),
    taxRatePercent: rate,
    taxAmount: Number(tax.toFixed(2)),
    grossAmount: Number(amt.toFixed(2)),
    mode,
    breakdown: `Gross: ${amt.toFixed(2)} with ${rate}% included Tax = Net: ${net.toFixed(2)}, Tax: ${tax.toFixed(2)}`,
  };
}

/**
 * Profit Margin Calculator: Computes profit, margin %, markup %
 */
export function profitMarginCalculator(
  cost: number,
  sellingPrice: number,
  units = 1
): {
  costPerUnit: number;
  sellingPricePerUnit: number;
  units: number;
  totalCost: number;
  totalRevenue: number;
  grossProfit: number;
  profitMarginPercent: number;
  markupPercent: number;
} {
  const c = Number(cost);
  const sp = Number(sellingPrice);
  const u = Math.max(1, Number(units) || 1);

  if (c < 0 || sp < 0) {
    throw new Error('Cost and selling price must be non-negative.');
  }

  const profitPerUnit = sp - c;
  const totalCost = c * u;
  const totalRevenue = sp * u;
  const grossProfit = profitPerUnit * u;

  const profitMarginPercent = sp > 0 ? (profitPerUnit / sp) * 100 : 0;
  const markupPercent = c > 0 ? (profitPerUnit / c) * 100 : 0;

  return {
    costPerUnit: Number(c.toFixed(2)),
    sellingPricePerUnit: Number(sp.toFixed(2)),
    units: u,
    totalCost: Number(totalCost.toFixed(2)),
    totalRevenue: Number(totalRevenue.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    profitMarginPercent: Number(profitMarginPercent.toFixed(2)),
    markupPercent: Number(markupPercent.toFixed(2)),
  };
}

/**
 * Discount Calculator: Computes final price, savings, discount %
 */
export function discountCalculator(
  originalPrice: number,
  discountPercent?: number,
  discountAmount?: number
): {
  originalPrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  savings: number;
} {
  const orig = Number(originalPrice);
  if (orig < 0) throw new Error('Original price must be positive.');

  let pct = 0;
  let savings = 0;

  if (discountPercent !== undefined && discountPercent !== null) {
    pct = Number(discountPercent);
    savings = (orig * pct) / 100;
  } else if (discountAmount !== undefined && discountAmount !== null) {
    savings = Number(discountAmount);
    pct = orig > 0 ? (savings / orig) * 100 : 0;
  } else {
    throw new Error('Please provide either discountPercent or discountAmount.');
  }

  savings = Math.min(savings, orig);
  const finalPrice = Math.max(0, orig - savings);

  return {
    originalPrice: Number(orig.toFixed(2)),
    discountPercent: Number(pct.toFixed(2)),
    discountAmount: Number(savings.toFixed(2)),
    finalPrice: Number(finalPrice.toFixed(2)),
    savings: Number(savings.toFixed(2)),
  };
}
